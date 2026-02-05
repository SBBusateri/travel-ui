import { Header } from "@/components/Header";
import { VehicleSelector } from "@/components/VehicleSelector";
import { DepartureSection } from "@/components/DepartureSection";
import { RouteSection } from "@/components/RouteSection";
import { AlternativeTravel } from "@/components/AlternativeTravel";
import { Button } from "@/components/ui/button";
import { Navigation, Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen hero-bg">
      <Header />
      
      {/* Hero Section */}
      <section className="container py-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 leading-tight">
            Plan Your Perfect
            <span className="block bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Road Trip
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Get personalized gas stop recommendations, compare travel alternatives, 
            and optimize your journey with smart AI insights.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="container pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          {/* Left Column */}
          <div className="space-y-6">
            <VehicleSelector />
            <DepartureSection />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <RouteSection />
          </div>
        </div>

        {/* Calculate Button */}
        <div className="max-w-7xl mx-auto mt-8">
          <Button variant="sunset" size="xl" className="w-full md:w-auto md:min-w-[300px] mx-auto flex">
            <Navigation className="h-5 w-5 mr-2" />
            Calculate My Trip
          </Button>
        </div>

        {/* Alternative Travel Section - Full Width */}
        <div className="max-w-7xl mx-auto mt-12">
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
