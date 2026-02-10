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

type GasStop = {
  id: string;
  name: string;
  position: [number, number];
  distanceFromStart: number;
  distanceFromLast?: number;
  vicinity?: string;
  estimatedArrival?: string;
  price?: string;
  fuelRemaining?: number;
};

type VehicleData = {
  adjustedRange?: number;
  mpg?: number;
  [key: string]: unknown;
};

interface Stop {
  id: string;
  location: string;
}

interface RouteSectionProps {
  adjustedRange?: number;
  vehicleMPG?: number;
  onVehicleDataChange?: (data: VehicleData) => void;
}

export function RouteSection({ adjustedRange: propAdjustedRange, vehicleMPG, onVehicleDataChange }: RouteSectionProps) {
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [gasStops, setGasStops] = useState<GasStop[]>([]);
  const [predictedGasStops, setPredictedGasStops] = useState<GasStop[]>([]);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<MapboxComponentRef>(null);

  const handleStartLocationChange = (location: string) => {
    setStartLocation(location);
  };

  const handleEndLocationChange = (location: string) => {
    setEndLocation(location);
  };

  const handleGoClick = () => {
    if (startLocation && endLocation) {
      mapRef.current?.calculateRouteWithStops();
    }
  };

  const handleDistanceCalculated = (distanceMiles: number) => {
    setDistance(distanceMiles);
  };

  const handleGasStopsCalculated = (stops: GasStop[]) => {
    setGasStops(stops);
  };

  const handlePredictedGasStopsCalculated = (stops: GasStop[]) => {
    setPredictedGasStops(stops);
  };

  const handleVehicleDataChange = (data: VehicleData) => {
    onVehicleDataChange?.(data);
  };

  const handleStopChange = (index: number, location: string) => {
    const newStops = [...stops];
    newStops[index].location = location;
    setStops(newStops);
  };

  const handleAddStop = () => {
    const newStop: Stop = {
      id: Date.now().toString(),
      location: "",
    };
    setStops([...stops, newStop]);
  };

  const handleRemoveStop = (index: number) => {
    setStops(stops.filter((stop, i) => i !== index));
  };

  const removeStop = (id: string) => {
    setStops(stops.filter((stop) => stop.id !== id));
    // Recalculate route if needed
    if (startLocation && endLocation) {
      mapRef.current?.calculateRouteWithStops();
    }
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
          {/* Map Container */}
          <div className="h-[500px] rounded-xl overflow-hidden border border-border relative">
            <MapboxComponent
              ref={mapRef}
              apiKey={import.meta.env.VITE_MAPBOX_TOKEN}
              onDistanceCalculated={handleDistanceCalculated}
              adjustedRange={propAdjustedRange}
              vehicleMPG={vehicleMPG}
              onGasStopsCalculated={handleGasStopsCalculated}
              onPredictedGasStopsCalculated={handlePredictedGasStopsCalculated}
              onStartLocationChanged={handleStartLocationChange}
              onEndLocationChanged={handleEndLocationChange}
              onStopChange={handleStopChange}
              onAddStop={handleAddStop}
              onRemoveStop={handleRemoveStop}
              startLocationValue={startLocation}
              endLocationValue={endLocation}
              stopValues={stops.map(stop => stop.location)}
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
              <div className="flex items-center justify-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold text-xs">A</div>
                <p className="text-xs text-muted-foreground">Start</p>
              </div>
              <p className="text-xl md:text-2xl font-bold text-primary">{Math.ceil(distance)}</p>
              <p className="text-xs text-muted-foreground">miles</p>
            </div>
            <div className="text-center p-3 md:p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-center gap-2">
                <div className="h-6 w-6 rounded-full bg-accent text-accent-foreground font-bold text-xs">B</div>
                <p className="text-xs text-muted-foreground">Destination</p>
              </div>
            </div>
            <div className="text-center p-3 md:p-4 rounded-lg bg-secondary/50">
              <p className="text-xl md:text-2xl font-bold text-primary">{gasStops.length}</p>
              <p className="text-xs text-muted-foreground">gas stops</p>
            </div>
            <div className="text-center p-3 md:p-4 rounded-lg bg-secondary/50">
              <p className="text-xl md:text-2xl font-bold text-primary">{propAdjustedRange || '—'}</p>
              <p className="text-xs text-muted-foreground">mile range</p>
            </div>
            <div className="text-center p-3 md:p-4 rounded-lg bg-secondary/50">
              <p className="text-xl md:text-2xl font-bold text-accent">{Math.round(distance / (propAdjustedRange || 1))}</p>
              <p className="text-xs text-muted-foreground">refuels needed</p>
            </div>
          </div>
        </div>
      )}

      {/* Gas Stops List */}
      {predictedGasStops.length > 0 && (
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
            {predictedGasStops.map((gasStop, index) => (
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
}
