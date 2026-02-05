import { useState, useRef } from "react";
import { MapPin, Plus, X, Navigation, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import GoogleMapComponent, { GoogleMapComponentRef } from "@/components/GoogleMapComponent";
import { apiService } from "@/services/apiService";

interface Stop {
  id: string;
  location: string;
}

interface RouteSectionProps {
  adjustedRange?: number;
}

export function RouteSection({ adjustedRange: propAdjustedRange }: RouteSectionProps) {
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [gasStops, setGasStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<GoogleMapComponentRef>(null);

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
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg sunset-gradient flex items-center justify-center">
          <Navigation className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Your Route</h2>
          <p className="text-sm text-muted-foreground">Where are you going?</p>
        </div>
      </div>

      <div className="relative">
        {/* Route Line */}
        <div className="absolute left-[19px] top-[44px] bottom-[44px] w-0.5 bg-gradient-to-b from-primary via-primary/50 to-accent" />

        <div className="space-y-4">
          {/* Start Location */}
          <div className="relative flex items-start gap-4">
            <div className="relative z-10 h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <MapPin className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Starting Point
              </Label>
              <Input
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                placeholder="Enter starting location..."
                className="h-11"
              />
            </div>
          </div>

          {/* Stops */}
          {stops.map((stop, index) => (
            <div
              key={stop.id}
              className="relative flex items-start gap-4 animate-fade-in"
            >
              <div className="relative z-10 h-10 w-10 rounded-full bg-secondary border-2 border-primary/30 flex items-center justify-center">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">
                    Stop {index + 1}
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeStop(stop.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={stop.location}
                  onChange={(e) => updateStop(stop.id, e.target.value)}
                  placeholder="Enter stop location..."
                  className="h-11"
                />
              </div>
            </div>
          ))}

          {/* Add Stop Button */}
          <div className="relative flex items-center gap-4 py-2">
            <div className="relative z-10 h-10 w-10 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center bg-background">
              <Plus className="h-4 w-4 text-primary/60" />
            </div>
            <Button
              variant="ghost"
              className="text-primary hover:text-primary hover:bg-primary/5"
              onClick={addStop}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add a stop
            </Button>
          </div>

          {/* End Location */}
          <div className="relative flex items-start gap-4">
            <div className="relative z-10 h-10 w-10 rounded-full bg-accent flex items-center justify-center shadow-lg">
              <MapPin className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Destination
              </Label>
              <Input
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
                placeholder="Enter destination..."
                className="h-11"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="relative h-96 rounded-xl overflow-hidden border border-border">
        <GoogleMapComponent
          ref={mapRef}
          apiKey="YOUR_GOOGLE_MAPS_API_KEY"
          onDistanceCalculated={handleDistanceCalculated}
          adjustedRange={propAdjustedRange}
          onGasStopsCalculated={handleGasStopsCalculated}
          onStartLocationChanged={setStartLocation}
          startLocationValue={startLocation}
          onGoClick={handleGoClick}
        />
      </div>

      {/* Route Summary */}
      {distance && (
        <div className="travel-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg teal-gradient flex items-center justify-center">
              <Navigation className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Route Summary</h3>
              <p className="text-sm text-muted-foreground">Your journey details</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold text-primary">{distance}</p>
              <p className="text-sm text-muted-foreground">miles</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold text-accent">{gasStops.length}</p>
              <p className="text-sm text-muted-foreground">gas stops</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold text-primary">{propAdjustedRange || '—'}</p>
              <p className="text-sm text-muted-foreground">mile range</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold text-accent">{Math.round((distance / (propAdjustedRange || 1)) * 10) / 10}</p>
              <p className="text-sm text-muted-foreground">tank count</p>
            </div>
          </div>
        </div>
      )}

      {/* Gas Stops List */}
      {gasStops.length > 0 && (
        <div className="travel-card space-y-4">
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
              <div key={index} className="p-4 rounded-lg border border-border bg-card">
                <div className="flex justify-between items-start">
                  <div>
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
