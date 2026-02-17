import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { MapPin, Plus, X, Navigation, MoreVertical, Loader2, Car, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { VehicleSelector } from "@/components/VehicleSelector";
import { DepartureSection } from "@/components/DepartureSection";
import GoogleMapComponent from "@/components/GoogleMapComponent";
import MapControls from "@/components/MapControls";
import { MapLocation, GasStop } from "@/types/googleMaps";

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

export const RouteSection = forwardRef<RouteSectionRef, RouteSectionProps>(({ adjustedRange: propAdjustedRange, vehicleMPG, onVehicleDataChange, onCalculateRoute, onStartLocationChanged, onEndLocationChanged }, ref) => {
  const [startLocation, setStartLocation] = useState<MapLocation | null>(null);
  const [endLocation, setEndLocation] = useState<MapLocation | null>(null);
  const [stopLocation, setStopLocation] = useState<MapLocation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [gasStops, setGasStops] = useState<GasStop[]>([]);
  const [loading, setLoading] = useState(false);

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
    if (route && route.routes && route.routes[0]) {
      const leg = route.routes[0].legs[0];
      const distanceMiles = leg.distance.value / 1609.34; // Convert meters to miles
      setDistance(distanceMiles);
      setDuration(leg.duration?.text || null);
    }
  };

  const calculateTrip = () => {
    if (startLocation && endLocation) {
      setLoading(true);
      onCalculateRoute?.();
      setTimeout(() => setLoading(false), 1000);
    }
  };

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
          onClick={calculateTrip}
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
      {distance && (
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
              <p className="text-lg font-bold text-primary">{Math.ceil(distance)}</p>
              <p className="text-xs text-muted-foreground">total miles</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30">
              <p className="text-lg font-bold text-primary">{duration || '—'}</p>
              <p className="text-xs text-muted-foreground">duration</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30">
              <p className="text-lg font-bold text-primary">{gasStops.length}</p>
              <p className="text-xs text-muted-foreground">gas stops</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30">
              <p className="text-lg font-bold text-primary">{propAdjustedRange || '—'}</p>
              <p className="text-xs text-muted-foreground">mile range</p>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {/* Start Location */}
            {startLocation && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
                  A
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Start</p>
                  <p className="text-sm text-muted-foreground">{startLocation.address}</p>
                </div>
              </div>
            )}

            {/* Destination */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground font-bold text-xs flex items-center justify-center">
                  B
                </div>
                <div>
                  {startLocation && endLocation && (
                    <div>
                      <div className="text-sm text-gray-600">From:</div>
                      <div className="font-medium">{startLocation?.address || ''}</div>
                      <div className="text-sm text-gray-600">To:</div>
                      <div className="font-medium">{endLocation?.address || ''}</div>
                    </div>
                  )}
                </div>
              </div>

            {/* Gas Stops */}
            {gasStops.map((gasStop, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="h-8 w-8 rounded-full bg-yellow-500 text-white font-bold text-xs flex items-center justify-center">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Gas Stop {index + 1}</p>
                  <p className="text-sm text-muted-foreground">{gasStop.vicinity || gasStop.name}</p>
                </div>
              </div>
            ))}

            {/* Destination */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground font-bold text-xs flex items-center justify-center">
                B
              </div>
              <div>
                {startLocation && endLocation && (
                  <div>
                    <div className="text-sm text-gray-600">From:</div>
                    <div className="font-medium">{startLocation?.address || ''}</div>
                    <div className="text-sm text-gray-600">To:</div>
                    <div className="font-medium">{endLocation?.address || ''}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gas Stops List */}
      {gasStops.length > 0 && (
        <div className="travel-card space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg sunset-gradient flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Recommended Gas Stops</h3>
              <p className="text-sm text-muted-foreground">Optimized fueling stations along your route</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {gasStops.map((gasStop, index) => (
              <div key={index} className="p-3 md:p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-yellow-500 text-white font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </div>
                      <h4 className="font-semibold text-foreground">{gasStop.name}</h4>
                      <p className="text-sm text-muted-foreground">{gasStop.vicinity}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Distance from start:</span>
                        <span className="font-medium text-gray-900">{gasStop.distanceFromStart} mi</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Arrival time:</span>
                        <span className="font-medium text-blue-600">{gasStop.estimatedArrival}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Gas price:</span>
                        <span className="font-medium text-green-600">{gasStop.price}/gal</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Fuel remaining:</span>
                        <span className="font-medium text-orange-600">{gasStop.fuelRemaining?.toFixed(0)} mi</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{gasStop.distanceFromLast} miles from last stop</div>
                    <div className="text-lg font-bold text-primary">${gasStop.price}</div>
                    <div className="text-xs text-muted-foreground">per gallon</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

RouteSection.displayName = 'RouteSection';
