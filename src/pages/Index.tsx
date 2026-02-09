import { Header } from "@/components/Header";
import { RouteSection } from "@/components/RouteSection";
import { AlternativeTravel } from "@/components/AlternativeTravel";
import { Button } from "@/components/ui/button";
import { Navigation, Sparkles } from "lucide-react";
import { useState } from "react";

const Index = () => {
  const [vehicleData, setVehicleData] = useState<any>(null);

  const handleVehicleChange = (data: any) => {
    setVehicleData(data);
  };

  return (
    <div className="min-h-screen hero-bg">
      <Header />
      
      {/* Hero Section */}
      <section className="container py-8 md:py-12 lg:py-16 px-4">
        <div className="max-w-3xl mx-auto text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 md:mb-6 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI-Powered Travel Planning</span>
            <span className="sm:hidden">AI Travel</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-foreground mb-4 leading-tight">
            Plan Your Perfect
            <span className="block bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Road Trip
            </span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
            Get personalized gas stop recommendations, compare travel alternatives, 
            and optimize your journey with smart AI insights.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="container pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <RouteSection adjustedRange={vehicleData?.adjustedRange} onVehicleDataChange={setVehicleData} />
        </div>

        {/* Calculate Button */}
        <div className="max-w-7xl mx-auto mt-8 px-4">
          <Button 
            variant="sunset" 
            size="xl" 
            className="w-full md:w-auto md:min-w-[300px] mx-auto flex animate-slide-up"
            disabled={!vehicleData || !vehicleData.adjustedRange}
          >
            <Navigation className="h-5 w-5 mr-2" />
            Calculate My Trip
          </Button>
        </div>

        {/* Alternative Travel Section - Full Width */}
        <div className="max-w-7xl mx-auto mt-12 px-4">
          <AlternativeTravel />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 TripWise. Smart travel planning made simple.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
