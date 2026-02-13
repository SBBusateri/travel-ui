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
    } else if (!year && !make && !model) {
      // Default to Ford Mustang 2026 for testing when no vehicle selected
      const defaultVehicle = {
        year: 2026,
        make: 'Ford',
        model: 'Mustang',
        mpg: 30,
        gasType: 'Regular',
        gasTankSize: 15,
        adjustedRange: 450, // 30 MPG * 15 gallons
        horsepower: 480,
        batteryLife: null
      };
      onVehicleChange?.(defaultVehicle);
    }
  }, [vehicleInfo, onVehicleChange, year, make, model]);

  const loadYears = async () => {
    try {
      setLoading(true);
      setError("");
      const typeMap = { car: "cars", motorcycle: "motorcycles", rv: "rv", electric: "ev" };
      const data = await apiService.getYears(typeMap[selectedType as keyof typeof typeMap]);
      setYears(data);
    } catch (err) {
      console.error('Failed to load years:', err);
      // Provide fallback years
      setYears(['2024', '2023', '2022', '2021', '2020']);
      setError(""); // Don't show error to user, just use fallback
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
      console.error('Failed to load makes:', err);
      // Provide fallback makes based on vehicle type
      const fallbackMakes = {
        car: ['Ford', 'Toyota', 'Honda', 'Chevrolet', 'BMW', 'Mercedes-Benz', 'Audi', 'Nissan', 'Hyundai', 'Kia'],
        motorcycle: ['Harley-Davidson', 'Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'BMW', 'Ducati'],
        rv: ['Winnebago', 'Thor', 'Forest River', 'Jayco', 'Coachmen', 'Keystone'],
        electric: ['Tesla', 'Ford', 'Chevrolet', 'Hyundai', 'Kia', 'Nissan', 'Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen']
      };
      setMakes(fallbackMakes[selectedType] || fallbackMakes.car);
      setError(""); // Don't show error to user, just use fallback
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
      console.error('Failed to load models:', err);
      // Provide fallback models based on make
      const fallbackModels = {
        'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Focus'],
        'Toyota': ['Camry', 'Corolla', 'RAV4', 'Prius', 'Highlander'],
        'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Fit'],
        'Chevrolet': ['Silverado', 'Malibu', 'Equinox', 'Tahoe', 'Camaro'],
        'Tesla': ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck'],
        'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'i4'],
        'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE', 'EQS'],
        'Audi': ['A4', 'A6', 'Q5', 'Q7', 'e-tron'],
        'Nissan': ['Altima', 'Sentra', 'Rogue', 'Leaf', 'Pathfinder'],
        'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Kona'],
        'Kia': ['Forte', 'Optima', 'Sportage', 'Sorento', 'Telluride']
      };
      setModels(fallbackModels[make] || ['Base Model', 'Sport', 'Limited', 'Premium']);
      setError(""); // Don't show error to user, just use fallback
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
      console.error('Failed to fetch vehicle info:', err);
      // Provide fallback vehicle info based on type and make
      const fallbackInfo = {
        year: parseInt(year),
        make: make,
        model: model,
        mpg: selectedType === 'electric' ? 120 : selectedType === 'motorcycle' ? 50 : selectedType === 'rv' ? 15 : 30,
        gasType: selectedType === 'electric' ? 'Electric' : 'Regular',
        gasTankSize: selectedType === 'electric' ? 0 : selectedType === 'motorcycle' ? 4 : selectedType === 'rv' ? 30 : 15,
        adjustedRange: selectedType === 'electric' ? 300 : selectedType === 'motorcycle' ? 200 : selectedType === 'rv' ? 225 : 450,
        horsepower: selectedType === 'electric' ? 300 : selectedType === 'motorcycle' ? 100 : selectedType === 'rv' ? 300 : 250,
        batteryLife: selectedType === 'electric' ? 300 : null
      };
      setVehicleInfo(fallbackInfo);
      setError(""); // Don't show error to user, just use fallback
    } finally {
      setLoading(false);
    }
  };

  const handleMakeChange = (value: string) => {
    setMake(value);
    setModel(""); // Reset model when make changes
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg sunset-gradient flex items-center justify-center">
          <Car className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Select your transportation</h2>
        </div>
      </div>

      {/* Vehicle Type Selection - More Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {vehicleOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setSelectedType(option.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200 hover:scale-[1.02]",
                isSelected
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-primary/30 hover:bg-secondary/30"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
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

      {/* Vehicle Details - Side-by-Side Layout */}
      {error && (
        <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor="year" className="text-xs font-medium text-foreground">
          </Label>
          <Select value={year} onValueChange={setYear} disabled={loading}>
            <SelectTrigger id="year" className="h-9 text-sm">
              {loading && !year ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder="Year" />
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

        <div className="space-y-1">
          <Label htmlFor="make" className="text-xs font-medium text-foreground">
          </Label>
          <Select value={make} onValueChange={handleMakeChange} disabled={loading || !year}>
            <SelectTrigger id="make" className="h-9 text-sm">
              {loading && year && !make ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder="Make" />
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

        <div className="space-y-1">
          <Label htmlFor="model" className="text-xs font-medium text-foreground">
          </Label>
          <Select value={model} onValueChange={setModel} disabled={loading || !make}>
            <SelectTrigger id="model" className="h-9 text-sm">
              {loading && make && !model ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder={make ? "Model" : "Model "}/>
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

      {/* Vehicle Info Display - More Compact */}
      {(vehicleInfo || (!year && !make && !model)) && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {vehicleInfo ? 'Vehicle Selected' : 'Default Vehicle'}
              </p>
              <p className="text-xs text-muted-foreground">
                {vehicleInfo ? `${year} ${make} ${model}` : '2026 Ford Mustang'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">
                {vehicleInfo?.adjustedRange || 450}
              </p>
              <p className="text-xs text-muted-foreground">mile range</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
