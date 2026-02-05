import { useState } from "react";
import { Car, Bike, Truck, Zap } from "lucide-react";
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

// Sample data - in production this would come from an API
const carMakes = ["Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Tesla", "Mercedes", "Audi"];
const carModels: Record<string, string[]> = {
  Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "Prius"],
  Honda: ["Civic", "Accord", "CR-V", "Pilot", "Odyssey"],
  Ford: ["F-150", "Mustang", "Explorer", "Escape", "Bronco"],
  Chevrolet: ["Silverado", "Malibu", "Equinox", "Tahoe", "Camaro"],
  BMW: ["3 Series", "5 Series", "X3", "X5", "M4"],
  Tesla: ["Model S", "Model 3", "Model X", "Model Y", "Cybertruck"],
  Mercedes: ["C-Class", "E-Class", "GLE", "S-Class", "G-Class"],
  Audi: ["A4", "A6", "Q5", "Q7", "e-tron"],
};

const years = Array.from({ length: 30 }, (_, i) => (2025 - i).toString());

export function VehicleSelector() {
  const [selectedType, setSelectedType] = useState<VehicleType>("car");
  const [year, setYear] = useState<string>("");
  const [make, setMake] = useState<string>("");
  const [model, setModel] = useState<string>("");

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="year" className="text-sm font-medium text-foreground">
            Year
          </Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger id="year" className="h-11">
              <SelectValue placeholder="Select year" />
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
          <Select value={make} onValueChange={handleMakeChange}>
            <SelectTrigger id="make" className="h-11">
              <SelectValue placeholder="Select make" />
            </SelectTrigger>
            <SelectContent>
              {carMakes.map((m) => (
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
          <Select value={model} onValueChange={setModel} disabled={!make}>
            <SelectTrigger id="model" className="h-11">
              <SelectValue placeholder={make ? "Select model" : "Select make first"} />
            </SelectTrigger>
            <SelectContent>
              {make &&
                carModels[make]?.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
