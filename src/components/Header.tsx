import { MapPin, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl sunset-gradient flex items-center justify-center shadow-lg">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">TripWise</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">Smart travel planning</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Plan Trip
          </a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            My Trips
          </a>
          <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Gas Stations
          </a>
          <Button variant="sunset" size="sm">
            Sign In
          </Button>
        </nav>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
