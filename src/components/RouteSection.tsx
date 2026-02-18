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

const formatMilesDisplay = (value: number | null | undefined, decimals = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return `${rounded.toFixed(decimals)} mi`;
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
        <div className="travel-card space-y-4 animate-fade-in mt-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg teal-gradient flex items-center justify-center">
              <Navigation className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Trip Summary</h3>
              <p className="text-sm text-muted-foreground">Your journey stops</p>
            </div>
          </div>
          
          {/* Trip Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-secondary/30">
              <p className="text-lg font-bold text-primary">{formatMilesDisplay(distance, 1)}</p>
              <p className="text-xs text-muted-foreground">total miles</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30">
              <p className="text-lg font-bold text-primary">{duration ?? '—'}</p>
              <p className="text-xs text-muted-foreground">duration</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30">
              <p className="text-lg font-bold text-primary">{gasStops.filter((stop) => stop.type === 'fuel').length}</p>
              <p className="text-xs text-muted-foreground">gas stops</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30">
              <p className="text-lg font-bold text-primary">{formatMilesDisplay(lastUsedRange ?? propAdjustedRange ?? null)}</p>
              <p className="text-xs text-muted-foreground">mile range</p>
            </div>
          </div>

          <StopSummaryList
            startLocation={startLocation}
            endLocation={endLocation}
            gasStops={gasStops}
            fallbackDistance={distance}
            fallbackRange={lastUsedRange ?? propAdjustedRange ?? DEFAULT_ADJUSTED_RANGE_MILES}
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
}

const StopSummaryList = ({ startLocation, endLocation, gasStops, fallbackDistance, fallbackRange }: StopSummaryListProps) => {
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
  let fuelCounter = 0;

  const getBadgeProps = (stop: GasStop) => {
    if (stop.type === 'start') {
      return { label: 'A', classes: 'bg-primary text-primary-foreground' };
    }

    if (stop.type === 'destination') {
      return { label: 'B', classes: 'bg-accent text-accent-foreground' };
    }

    fuelCounter += 1;
    return { label: `${fuelCounter}`, classes: 'bg-yellow-500 text-white' };
  };

  const buildLine = (stop: GasStop) => {
    const baseTitle = [stop.name, stop.address].filter(Boolean).join(' | ') || stop.name || 'Stop';

    const detailParts: string[] = [];

    if (stop.type === 'start') {
      detailParts.push('Trip start');
    } else if (stop.type === 'destination') {
      detailParts.push('Arrive');
    }

    if (stop.type !== 'start' && typeof stop.distanceFromLastMiles === 'number') {
      detailParts.push(`${formatMilesDisplay(stop.distanceFromLastMiles, 0)} from last stop`);
    }

    if (!detailParts.length) {
      return baseTitle;
    }

    return `${baseTitle} — ${detailParts.join(' — ')}`;
  };

  return (
    <div className="space-y-2 mt-4">
      {displayedStops.map((stop, index) => {
        const { label, classes } = getBadgeProps(stop);
        const line = buildLine(stop);

        return (
          <div key={`${stop.type}-${index}`} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center ${classes}`}>
              {label}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground leading-snug">{line}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
