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
    <div className="travel-card space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg sunset-gradient flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Departure time</h2>
          </div>
        </div>
        <Button variant="leave-now" size="sm" onClick={handleLeaveNow} className="gap-2">
          <Zap className="h-4 w-4" />
          Leave Now
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Picker */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-11 justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
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
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Time</Label>
          <div className="flex gap-2">
            <Select value={hour} onValueChange={setHour}>
              <SelectTrigger className="h-11 flex-1">
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
            <span className="flex items-center text-muted-foreground font-bold">:</span>
            <Select value={minute} onValueChange={setMinute}>
              <SelectTrigger className="h-11 flex-1">
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
            <div className="flex rounded-lg border-2 border-input overflow-hidden">
              <button
                onClick={() => setPeriod("AM")}
                className={cn(
                  "px-3 h-11 text-sm font-medium transition-colors",
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
                  "px-3 h-11 text-sm font-medium transition-colors",
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
