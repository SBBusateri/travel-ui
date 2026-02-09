import { useState } from "react";
import { Calendar, Clock, Zap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
const minutes = ["00", "15", "30", "45"];

export function DepartureSection() {
  const [date, setDate] = useState<Date>();
  const [hour, setHour] = useState<string>("");
  const [minute, setMinute] = useState<string>("");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  const handleLeaveNow = () => {
    const now = new Date();
    setDate(now);
    const currentHour = now.getHours();
    const formattedHour = currentHour > 12 ? currentHour - 12 : currentHour === 0 ? 12 : currentHour;
    setHour(formattedHour.toString().padStart(2, "0"));
    setMinute(Math.floor(now.getMinutes() / 15) * 15 === 60 ? "00" : (Math.floor(now.getMinutes() / 15) * 15).toString().padStart(2, "0"));
    setPeriod(currentHour >= 12 ? "PM" : "AM");
  };

  return (
    <div className="space-y-4">
      {/* Header */}


      {/* Separator Line */}
      <div className="border-t border-dashed border-border/1000 my-2" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg sunset-gradient flex items-center justify-center">
            <Clock className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Departure time</h2>
          </div>
        </div>
        
        {/* Leave Now Button - Top Left */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLeaveNow}
          className="text-xs h-7 px-2 border-border/50 hover:border-primary/30 hover:bg-primary/5"
        >
          <Zap className="h-3 w-3 mr-1" />
          Leave Now
        </Button>
      </div>

      {/* Date & Time Pickers - More Compact */}
      <div className="grid grid-cols-1 gap-2">
        {/* Date Picker */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-foreground mb-1">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-8 justify-start text-left font-normal text-sm",
                  !date && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-3 w-3" />
                {date ? format(date, "MMM d, yyyy") : <span>Select date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className="pointer-events-auto"
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Picker */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-foreground mb-1">Time</Label>
          <div className="flex gap-1">
            <Select value={hour} onValueChange={setHour}>
              <SelectTrigger className="h-8 flex-1 text-sm">
                <SelectValue placeholder="HH" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="flex items-center text-muted-foreground font-bold text-sm">:</span>
            <Select value={minute} onValueChange={setMinute}>
              <SelectTrigger className="h-8 flex-1 text-sm">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {minutes.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-md border border-input overflow-hidden">
              <button
                onClick={() => setPeriod("AM")}
                className={cn(
                  "px-2 h-8 text-xs font-medium transition-colors",
                  period === "AM"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-secondary"
                )}
              >
                AM
              </button>
              <button
                onClick={() => setPeriod("PM")}
                className={cn(
                  "px-2 h-8 text-xs font-medium transition-colors",
                  period === "PM"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-secondary"
                )}
              >
                PM
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
