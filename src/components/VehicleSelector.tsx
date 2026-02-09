import { useState, useEffect } from "react";
import { Car, Bike, Truck, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiService } from "@/services/apiService";

type VehicleType = "car" | "motorcycle" | "rv" | "electric";

interface VehicleOption {
  id: VehicleType;
  label: string;
  icon: React.ElementType;
}

const vehicleOptions: VehicleOption[] = [
  { id: "car", label: "Car", icon: Car },
  { id: "motorcycle", label: "Motorcycle", icon: Bike },
  { id: "rv", label: "RV", icon: Truck },
  { id: "electric", label: "Electric", icon: Zap },
];

interface VehicleSelectorProps {
  onVehicleChange?: (data: any) => void;
}

export function VehicleSelector({ onVehicleChange }: VehicleSelectorProps) {
  const [selectedType, setSelectedType] = useState<VehicleType>("car");
  const [year, setYear] = useState<string>("");
  const [make, setMake] = useState<string>("");
  const [model, setModel] = useState<string>("");
  
  // API data states
  const [years, setYears] = useState<string[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);

  // Load years on mount
  useEffect(() => {
    loadYears();
  }, [selectedType]);

  // Load makes when year changes
  useEffect(() => {
    if (year) {
      loadMakes();
    } else {
      setMakes([]);
      setModels([]);
    }
  }, [year, selectedType]);

  // Load models when make changes
  useEffect(() => {
    if (year && make) {
      loadModels();
    } else {
      setModels([]);
    }
  }, [year, make, selectedType]);

  // Fetch vehicle info when model is selected
  useEffect(() => {
    if (year && make && model) {
      fetchVehicleInfo();
    }
  }, [year, make, model, selectedType]);

  // Notify parent when vehicle info changes
  useEffect(() => {
    if (vehicleInfo) {
      onVehicleChange?.(vehicleInfo);
    }
  }, [vehicleInfo, onVehicleChange]);

  const loadYears = async () => {
    try {
      setLoading(true);
      setError("");
      const typeMap = { car: "cars", motorcycle: "motorcycles", rv: "rv", electric: "ev" };
      const data = await apiService.getYears(typeMap[selectedType as keyof typeof typeMap]);
      setYears(data);
    } catch (err) {
      setError("Failed to load years");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMakes = async () => {
    try {
      setLoading(true);
      setError("");
      const typeMap = { car: "cars", motorcycle: "motorcycles", rv: "rv", electric: "ev" };
      const data = await apiService.getMakes(year, typeMap[selectedType as keyof typeof typeMap]);
      setMakes(data);
    } catch (err) {
      setError("Failed to load makes");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      setLoading(true);
      setError("");
      const typeMap = { car: "cars", motorcycle: "motorcycles", rv: "rv", electric: "ev" };
      const data = await apiService.getModels(year, make, typeMap[selectedType as keyof typeof typeMap]);
      setModels(data);
    } catch (err) {
      setError("Failed to load models");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleInfo = async () => {
    try {
      setLoading(true);
      setError("");
      const typeMap = { car: "cars", motorcycle: "motorcycles", rv: "rv", electric: "ev" };
      const data = await apiService.getVehicleInfo({
        year,
        make,
        model,
        type: typeMap[selectedType as keyof typeof typeMap]
      });
      setVehicleInfo(data);
    } catch (err) {
      setError("Failed to fetch vehicle info");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMakeChange = (value: string) => {
    setMake(value);
    setModel(""); // Reset model when make changes
  };

  return (
    <div className="travel-card space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg sunset-gradient flex items-center justify-center">
          <Car className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Your Vehicle</h2>
          <p className="text-sm text-muted-foreground">Select your ride</p>
        </div>
      </div>

      {/* Vehicle Type Selection */}
      <div className="grid grid-cols-4 gap-3">
        {vehicleOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setSelectedType(option.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/30 hover:bg-secondary/50"
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-colors",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Vehicle Details */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="year" className="text-sm font-medium text-foreground">
            Year
          </Label>
          <Select value={year} onValueChange={setYear} disabled={loading}>
            <SelectTrigger id="year" className="h-11">
              {loading && !year ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder="Select year" />
              )}
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="make" className="text-sm font-medium text-foreground">
            Make
          </Label>
          <Select value={make} onValueChange={handleMakeChange} disabled={loading || !year}>
            <SelectTrigger id="make" className="h-11">
              {loading && year && !make ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder="Select make" />
              )}
            </SelectTrigger>
            <SelectContent>
              {makes.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model" className="text-sm font-medium text-foreground">
            Model
          </Label>
          <Select value={model} onValueChange={setModel} disabled={loading || !make}>
            <SelectTrigger id="model" className="h-11">
              {loading && make && !model ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder={make ? "Select model" : "Select make first"} />
              )}
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Vehicle Info Display */}
      {vehicleInfo && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Vehicle Selected</p>
              <p className="text-sm text-muted-foreground">
                {year} {make} {model}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">
                {vehicleInfo.adjustedRange || '—'}
              </p>
              <p className="text-xs text-muted-foreground">mile range</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
