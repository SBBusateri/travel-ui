import { useState, useRef } from "react";
import { MapPin, Plus, X, Navigation, MoreVertical, Loader2, Car, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import MapboxComponent, { MapboxComponentRef } from "@/components/MapboxComponent";
import { apiService } from "@/services/apiService";
import { VehicleSelector } from "@/components/VehicleSelector";
import { DepartureSection } from "@/components/DepartureSection";

interface Stop {
  id: string;
  location: string;
}

interface RouteSectionProps {
  adjustedRange?: number;
  onVehicleDataChange?: (data: any) => void;
}

export function RouteSection({ adjustedRange: propAdjustedRange, onVehicleDataChange }: RouteSectionProps) {
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [gasStops, setGasStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<MapboxComponentRef>(null);

  const handleDistanceCalculated = (distanceMiles: number) => {
    setDistance(distanceMiles);
  };

  const handleGasStopsCalculated = (stops: any[]) => {
    setGasStops(stops);
  };

  const handleGoClick = async () => {
    if (!startLocation || !endLocation || !propAdjustedRange) {
      console.warn('Missing required data for route calculation');
      return;
    }

    setLoading(true);
    try {
      const routeData = await apiService.calculateRoute({
        startLocation,
        endLocation,
        adjustedRange: propAdjustedRange
      });
      console.log('Route calculated:', routeData);
    } catch (error) {
      console.error('Error calculating route:', error);
    } finally {
      setLoading(false);
    }
  };

  const addStop = () => {
    const newStop: Stop = {
      id: Date.now().toString(),
      location: "",
    };
    setStops([...stops, newStop]);
  };

  const removeStop = (id: string) => {
    setStops(stops.filter((stop) => stop.id !== id));
  };

  const updateStop = (id: string, location: string) => {
    setStops(
      stops.map((stop) => (stop.id === id ? { ...stop, location } : stop))
    );
  };

  return (
    <div className="travel-card space-y-6">
      {/* Unified Container - Left: Vehicle/Departure (30%), Right: Map (70%) */}
      <div className="flex flex-col lg:flex-row gap-6 h-[500px]">
        {/* Left Side - Vehicle and Departure (30%) */}
        <div className="w-full lg:w-[30%] space-y-6">
          <VehicleSelector onVehicleChange={onVehicleDataChange} />
          <DepartureSection />
        </div>

        {/* Right Side - Map (70%) */}
        <div className="w-full lg:w-[70%] relative">
          <div className="h-full rounded-xl overflow-hidden border border-border">
            <MapboxComponent
              ref={mapRef}
              apiKey={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
              onDistanceCalculated={handleDistanceCalculated}
              adjustedRange={propAdjustedRange}
              onGasStopsCalculated={handleGasStopsCalculated}
              onStartLocationChanged={setStartLocation}
              startLocationValue={startLocation}
              onGoClick={handleGoClick}
            />
          </div>
        </div>
      </div>

      {/* Route Summary */}
      {distance && (
        <div className="travel-card space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg teal-gradient flex items-center justify-center">
              <Navigation className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Route Summary</h3>
              <p className="text-sm text-muted-foreground">Your journey details</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="text-center p-3 md:p-4 rounded-lg bg-secondary/50">
              <p className="text-xl md:text-2xl font-bold text-primary">{distance}</p>
              <p className="text-xs text-muted-foreground">miles</p>
            </div>
            <div className="text-center p-3 md:p-4 rounded-lg bg-secondary/50">
              <p className="text-xl md:text-2xl font-bold text-accent">{gasStops.length}</p>
              <p className="text-xs text-muted-foreground">gas stops</p>
            </div>
            <div className="text-center p-3 md:p-4 rounded-lg bg-secondary/50">
              <p className="text-xl md:text-2xl font-bold text-primary">{propAdjustedRange || '—'}</p>
              <p className="text-xs text-muted-foreground">mile range</p>
            </div>
            <div className="text-center p-3 md:p-4 rounded-lg bg-secondary/50">
              <p className="text-xl md:text-2xl font-bold text-accent">{Math.round((distance / (propAdjustedRange || 1)) * 10) / 10}</p>
              <p className="text-xs text-muted-foreground">tank count</p>
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
            {gasStops.map((stop, index) => (
              <div key={index} className="p-3 md:p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{stop.name}</h4>
                    <p className="text-sm text-muted-foreground">{stop.vicinity}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stop.distanceFromStart} miles from start • {stop.distanceFromLast} miles from last stop
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">${stop.price}</p>
                    <p className="text-xs text-muted-foreground">per gallon</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
