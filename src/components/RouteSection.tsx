import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleSelector } from "@/components/VehicleSelector";
import { DepartureSection } from "@/components/DepartureSection";
import GoogleMapComponent from "@/components/GoogleMapComponent";
import MapControls from "@/components/MapControls";
import { MapLocation, GasStop } from "@/types/googleMaps";
import { apiService } from "@/services/apiService";

type VehicleData = {
  adjustedRange?: number;
  mpg?: number;
  [key: string]: unknown;
};

export interface RouteSectionRef {
  calculateTrip: () => void;
}

interface RouteSectionProps {
  adjustedRange?: number;
  vehicleMPG?: number;
  onVehicleDataChange?: (data: VehicleData) => void;
  onCalculateRoute?: () => void;
  onStartLocationChanged?: (location: string) => void;
  onEndLocationChanged?: (location: string) => void;
}

const DEFAULT_ADJUSTED_RANGE_MILES = 300;
const METERS_PER_MILE = 1609.34;
const PLACEHOLDER_FUEL_PRICE = 3.5;

const formatMilesDisplay = (value: number | null | undefined, decimals = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return `${rounded.toFixed(decimals)} mi`;
};

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const formatDurationFromSeconds = (seconds: number | null | undefined) => {
  if (!seconds || seconds <= 0) return '—';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) {
    return '<1m';
  }

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
};

export const RouteSection = forwardRef<RouteSectionRef, RouteSectionProps>(({ adjustedRange: propAdjustedRange, vehicleMPG, onVehicleDataChange, onCalculateRoute, onStartLocationChanged, onEndLocationChanged }, ref) => {
  const [startLocation, setStartLocation] = useState<MapLocation | null>(null);
  const [endLocation, setEndLocation] = useState<MapLocation | null>(null);
  const [stopLocation, setStopLocation] = useState<MapLocation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [gasStops, setGasStops] = useState<GasStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUsedRange, setLastUsedRange] = useState<number | null>(null);

  const handleStartLocationChange = (location: MapLocation | null) => {
    setStartLocation(location);
    onStartLocationChanged?.(location?.address || '');
  };

  const handleEndLocationChange = (location: MapLocation | null) => {
    setEndLocation(location);
    onEndLocationChanged?.(location?.address || '');
  };

  const handleStopChange = (location: MapLocation | null) => {
    setStopLocation(location);
  };

  const handleRouteCalculated = (route: google.maps.DirectionsResult) => {
    const primaryRoute = route?.routes?.[0];
    const legs = primaryRoute?.legs ?? [];

    if (!primaryRoute || !legs.length) return;

    const totalDistanceMeters = legs.reduce((total, leg) => total + (leg.distance?.value ?? 0), 0);
    const totalDurationSeconds = legs.reduce((total, leg) => total + (leg.duration?.value ?? 0), 0);

    setDistance(totalDistanceMeters / METERS_PER_MILE);
    setDuration(formatDurationFromSeconds(totalDurationSeconds));
  };

  const calculateTrip = async () => {
    if (!startLocation || !endLocation) return;

    setLoading(true);
    try {
      onCalculateRoute?.();

      const rangeForCalculation = propAdjustedRange ?? lastUsedRange ?? DEFAULT_ADJUSTED_RANGE_MILES;

      const payload = {
        start: {
          lat: startLocation.lat,
          lng: startLocation.lng,
          address: startLocation.address
        },
        destination: {
          lat: endLocation.lat,
          lng: endLocation.lng,
          address: endLocation.address
        },
        adjustedRangeMiles: rangeForCalculation
      };

      const response = await apiService.getGasStops(payload);
      setGasStops(response?.stops || []);
      setLastUsedRange(rangeForCalculation);
    } catch (error) {
      console.error('Gas stop calculation failed:', error);
      setGasStops([]);
      setLastUsedRange(propAdjustedRange ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setGasStops([]);
    setLastUsedRange(null);
  }, [startLocation, endLocation]);

  useImperativeHandle(ref, () => ({
    calculateTrip
  }));

  const fuelStopsOnly = gasStops.filter((stop) => stop.type === 'fuel');
  const effectiveRangeMiles = lastUsedRange ?? propAdjustedRange ?? DEFAULT_ADJUSTED_RANGE_MILES;
  const mpgValue = vehicleMPG ?? null;
  const estimatedTankGallons = mpgValue ? effectiveRangeMiles / mpgValue : null;
  const perFillCost = estimatedTankGallons !== null ? estimatedTankGallons * PLACEHOLDER_FUEL_PRICE : null;
  const totalFuelCost = perFillCost !== null && fuelStopsOnly.length > 0
    ? perFillCost * fuelStopsOnly.length
    : null;

  return (
    <div className="travel-card space-y-6">
      {/* Main Container - Left: Inputs (30%), Right: Map (70%) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side - All Inputs Container (30%) */}
        <div className="w-full lg:w-[30%] space-y-6">
          <div className="space-y-6">
            <VehicleSelector onVehicleChange={onVehicleDataChange} />
            <DepartureSection />
          </div>
        </div>

        {/* Right Side - Map (70%) */}
        <div className="w-full lg:w-[70%] relative">
          <div className="h-[500px] rounded-xl overflow-hidden border border-border relative">
            <GoogleMapComponent
              startLocation={startLocation}
              destinationLocation={endLocation}
              stopLocation={stopLocation}
              fuelStops={gasStops}
              onRouteCalculated={handleRouteCalculated}
              className="w-full h-full"
            />
            <div className="absolute top-4 left-4 z-10 w-full max-w-[40%] min-w-[220px] pr-4">
              <MapControls
                startLocation={startLocation}
                destinationLocation={endLocation}
                onStartLocationChange={handleStartLocationChange}
                onDestinationChange={handleEndLocationChange}
                stopLocation={stopLocation}
                onStopChange={handleStopChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Calculate My Trip Button */}
      <div className="max-w-7xl mx-auto px-4">
        <Button 
          variant="sunset" 
          size="xl" 
          className={`w-full md:w-auto md:min-w-[300px] mx-auto flex animate-slide-up`}
          disabled={loading || !startLocation || !endLocation}
          onClick={() => void calculateTrip()}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calculating Route...
            </>
          ) : (
            <>
              <Navigation className="h-5 w-5 mr-2" />
              Calculate My Trip
            </>
          )}
        </Button>
      </div>

      {/* Route Summary */}
      {distance !== null && (
        <div className="space-y-6 animate-fade-in mt-8">
          <div className="rounded-2xl border border-border bg-background text-foreground shadow-sm p-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Trip summary</p>
                <h3 className="text-lg font-semibold leading-tight">Ready for the road</h3>
                <p className="text-xs text-muted-foreground">Full itinerary with fuel confidence</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase">Total distance</p>
                <p className="text-xl font-bold leading-tight">{formatMilesDisplay(distance, 1)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              {[
                {
                  label: 'Drive time',
                  value: duration ?? '—',
                  helper: 'est. duration'
                },
                {
                  label: 'Fuel top-offs',
                  value: fuelStopsOnly.length,
                  helper: 'planned stops'
                },
                {
                  label: 'Vehicle range',
                  value: formatMilesDisplay(lastUsedRange ?? propAdjustedRange ?? null),
                  helper: 'per tank'
                },
                {
                  label: 'Total fuel cost',
                  value: totalFuelCost !== null ? formatCurrency(totalFuelCost) : '—',
                  helper: fuelStopsOnly.length
                    ? `${fuelStopsOnly.length} stops @ $${PLACEHOLDER_FUEL_PRICE.toFixed(2)}/gal`
                    : 'est. fuel spend'
                }
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-secondary/30 border border-border/60 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold mt-1">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.helper}</p>
                </div>
              ))}
            </div>
          </div>

          <StopSummaryList
            startLocation={startLocation}
            endLocation={endLocation}
            gasStops={gasStops}
            fallbackDistance={distance}
            fallbackRange={effectiveRangeMiles}
            estimatedFillCost={perFillCost}
            fuelPricePerGallon={PLACEHOLDER_FUEL_PRICE}
          />
        </div>
      )}
    </div>
  );
});

RouteSection.displayName = 'RouteSection';

interface StopSummaryListProps {
  startLocation: MapLocation | null;
  endLocation: MapLocation | null;
  gasStops: GasStop[];
  fallbackDistance: number | null;
  fallbackRange: number;
  estimatedFillCost: number | null;
  fuelPricePerGallon: number;
}

const StopSummaryList = ({
  startLocation,
  endLocation,
  gasStops,
  fallbackDistance,
  fallbackRange,
  estimatedFillCost,
  fuelPricePerGallon
}: StopSummaryListProps) => {
  const fallbackStops: GasStop[] = [];

  if (startLocation) {
    fallbackStops.push({
      type: 'start',
      name: 'Start',
      address: startLocation.address,
      location: { lat: startLocation.lat, lng: startLocation.lng },
      distanceFromStartMiles: 0,
      distanceFromLastMiles: 0
    });
  }

  if (endLocation) {
    fallbackStops.push({
      type: 'destination',
      name: 'Destination',
      address: endLocation.address,
      location: { lat: endLocation.lat, lng: endLocation.lng },
      distanceFromStartMiles: fallbackDistance ?? fallbackRange,
      distanceFromLastMiles: fallbackDistance ?? fallbackRange
    });
  }

  const displayedStops = gasStops.length ? gasStops : fallbackStops;
  let sequentialIndex = 1;

  const getBadgeProps = (stop: GasStop) => {
    if (stop.type === 'start') {
      return { label: 'S', classes: 'bg-primary text-primary-foreground' };
    }

    const label = `${sequentialIndex}`;
    sequentialIndex += 1;

    if (stop.type === 'destination') {
      return { label, classes: 'bg-accent text-accent-foreground' };
    }

    return { label, classes: 'bg-amber-500 text-white' };
  };

  const getStopTitle = (stop: GasStop) => {
    if (stop.type === 'start') return 'Trip start';
    if (stop.type === 'destination') return 'Arrive at destination';
    return stop.name || 'Fuel stop';
  };

  const getMetaLabel = (stop: GasStop) => {
    if (stop.type === 'start') return startLocation?.address || stop.address || '';
    if (stop.type === 'destination') return endLocation?.address || stop.address || '';
    return stop.address || '';
  };

  const getHoursDisplay = (stop: GasStop) => {
    if (stop.type !== 'fuel') return null;
    const status = typeof stop.isOpenNow === 'boolean'
      ? stop.isOpenNow
        ? 'Open now'
        : 'Closed'
      : null;
    const hoursLine = stop.hours?.[0];

    if (!status && !hoursLine) return null;
    if (status && hoursLine) {
      return `${status} • ${hoursLine}`;
    }
    return status ?? hoursLine ?? null;
  };

  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-4">
      <div className="text-sm font-semibold text-muted-foreground mb-4">Stops & legs</div>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        {displayedStops.map((stop, index) => {
          const { label, classes } = getBadgeProps(stop);
          const title = getStopTitle(stop);
          const subtitle = getMetaLabel(stop);
          const hoursDisplay = getHoursDisplay(stop);
          const showConnector = index < displayedStops.length - 1;

          return (
            <div key={`${stop.type}-${index}`} className="relative pl-12 pb-8 last:pb-0">
              {showConnector && (
                <span className="absolute left-4 top-8 bottom-0 w-px bg-border" />
              )}
              <div className={`absolute left-0 top-1.5 h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center shadow ${classes}`}>
                {label}
              </div>
              <div className="rounded-xl bg-background border border-border/60 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground leading-snug">
                      {title}
                      {hoursDisplay && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{hoursDisplay}</span>
                      )}
                    </p>
                    {subtitle && (
                      <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground md:justify-end">
                    {typeof stop.distanceFromLastMiles === 'number' && stop.type !== 'start' && (
                      <span className="px-2 py-0.5 rounded-full bg-secondary/60">
                        +{formatMilesDisplay(stop.distanceFromLastMiles, 0)} from last stop
                      </span>
                    )}
                    {typeof stop.distanceFromStartMiles === 'number' && (
                      <span className="px-2 py-0.5 rounded-full bg-secondary/60">
                        {formatMilesDisplay(stop.distanceFromStartMiles, 0)} from start
                      </span>
                    )}
                    {stop.type === 'fuel' && estimatedFillCost !== null && (
                      <span className="px-2 py-0.5 rounded-full bg-secondary/60">
                        {formatCurrency(estimatedFillCost)} est. fill-up · ${fuelPricePerGallon.toFixed(2)}/gal
                      </span>
                    )}
                    {stop.type === 'fuel' && estimatedFillCost === null && (
                      <span className="px-2 py-0.5 rounded-full bg-secondary/60">
                        ${fuelPricePerGallon.toFixed(2)}/gal placeholder
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
