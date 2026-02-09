import { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import Map, { Marker, NavigationControl, GeolocateControl } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Navigation, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const defaultCenter = { lng: -90.1994, lat: 38.6270 };

interface Stop {
  id: string;
  location: string;
  position?: [number, number] | null;
}

interface MapboxComponentProps {
  apiKey: string;
  onDistanceCalculated?: (distance: number) => void;
  adjustedRange?: number;
  onGasStopsCalculated?: (stops: any[]) => void;
  onStartLocationChanged?: (address: string) => void;
  startLocationValue?: string;
  onGoClick?: () => void;
  className?: string;
}

const MapboxComponent = forwardRef<MapboxComponentRef, MapboxComponentProps>(({
  apiKey,
  onDistanceCalculated,
  adjustedRange,
  onGasStopsCalculated,
  onStartLocationChanged,
  startLocationValue,
  onGoClick,
  className
}, ref) => {
  const [startLocation, setStartLocation] = useState<[number, number] | null>(null);
  const [endLocation, setEndLocation] = useState<[number, number] | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [gasStops, setGasStops] = useState<any[]>([]);
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");

  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].center as [number, number];
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
    return null;
  };

  const findNearestGasStation = async (position: [number, number], maxDistance = 5000): Promise<any> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/gas%20station.json?proximity=${position[0]},${position[1]}&access_token=${apiKey}&limit=5`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const nearest = data.features[0];
        return {
          position: nearest.center as [number, number],
          name: nearest.text,
          vicinity: nearest.place_name,
          price: (Math.random() * 0.5 + 3.5).toFixed(2)
        };
      }
    } catch (error) {
      console.error("Gas station search error:", error);
    }
    return null;
  };

  const calculateRoute = useCallback(async () => {
    if (!startLocation || !endLocation) return;

    try {
      const coordinates = [startLocation, ...waypoints, endLocation];
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates.join(';')}?access_token=${apiKey}&geometries=geojson&overview=full`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRoute(route);
        
        const distanceKm = route.distance / 1000;
        const distanceMiles = distanceKm * 0.621371;
        onDistanceCalculated?.(parseFloat(distanceMiles.toFixed(1)));

        if (map) {
          const bounds = new mapboxgl.LngLatBounds();
          route.geometry.coordinates.forEach((coord: [number, number]) => {
            bounds.extend(coord);
          });
          map.fitBounds(bounds, { padding: 50 });
        }
      }
    } catch (error) {
      console.error("Route calculation error:", error);
    }
  }, [startLocation, endLocation, waypoints, map, apiKey, onDistanceCalculated]);

  const calculateRouteWithStops = async () => {
    if (!startLocation || !endLocation || !adjustedRange) return;

    setLoading(true);
    try {
      // First get the basic route
      const coordinates = [startLocation, endLocation];
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates.join(';')}?access_token=${apiKey}&geometries=geojson&overview=full`
      );
      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        setLoading(false);
        return;
      }

      const route = data.routes[0];
      const distanceKm = route.distance / 1000;
      const distanceMiles = distanceKm * 0.621371;
      onDistanceCalculated?.(parseFloat(distanceMiles.toFixed(1)));

      const safeRange = adjustedRange - 15;
      const preliminaryStops = [];
      const path = route.geometry.coordinates as [number, number][];

      // Find first gas station near start
      const firstStop = await findNearestGasStation(startLocation, 5000);
      if (firstStop) {
        const firstStopDistance = calculateDistance(startLocation, firstStop.position);
        preliminaryStops.push({
          position: firstStop.position,
          distanceFromStart: firstStopDistance.toFixed(1),
          distanceFromLast: firstStopDistance.toFixed(1),
          name: firstStop.name,
          vicinity: firstStop.vicinity,
          price: firstStop.price
        });
      }

      // Calculate gas stops along the route
      let totalDistanceFromStart = firstStop ? calculateDistance(startLocation, firstStop.position) : 0;
      let lastStopPosition = firstStop?.position || startLocation;
      let distanceSinceLastStop = 0;

      for (let i = 0; i < path.length - 1; i++) {
        const segmentDistance = calculateDistance(path[i], path[i + 1]);
        totalDistanceFromStart += segmentDistance;
        distanceSinceLastStop += segmentDistance;

        if (distanceSinceLastStop >= safeRange && totalDistanceFromStart < distanceMiles) {
          const targetPosition = path[i];
          const stop = await findNearestGasStation(targetPosition, 10000);

          if (stop) {
            const distanceFromLast = calculateDistance(lastStopPosition, stop.position);
            preliminaryStops.push({
              position: stop.position,
              distanceFromStart: totalDistanceFromStart.toFixed(1),
              distanceFromLast: distanceFromLast.toFixed(1),
              name: stop.name,
              vicinity: stop.vicinity,
              price: stop.price
            });
            lastStopPosition = stop.position;
            distanceSinceLastStop = 0;
          }
        }
      }

      // Update route with gas stops
      const routeCoordinates = [startLocation, ...preliminaryStops.map(stop => stop.position), endLocation];
      const routeWithStopsResponse = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${routeCoordinates.join(';')}?access_token=${apiKey}&geometries=geojson&overview=full`
      );
      const routeWithStopsData = await routeWithStopsResponse.json();

      if (routeWithStopsData.routes && routeWithStopsData.routes.length > 0) {
        setRoute(routeWithStopsData.routes[0]);
        
        if (map) {
          const bounds = new mapboxgl.LngLatBounds();
          routeWithStopsData.routes[0].geometry.coordinates.forEach((coord: [number, number]) => {
            bounds.extend(coord);
          });
          map.fitBounds(bounds, { padding: 50 });
        }
      }

      setGasStops(preliminaryStops);
      onGasStopsCalculated?.(preliminaryStops);
    } catch (error) {
      console.error("Error calculating route with stops:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1[1] * Math.PI / 180) * Math.cos(coord2[1] * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;
    return distanceKm * 0.621371; // Convert to miles
  };

  const handleStartLocationChange = async (value: string) => {
    setStartInput(value);
    onStartLocationChanged?.(value);
    
    const coords = await geocodeAddress(value);
    if (coords) {
      setStartLocation(coords);
      if (map) {
        map.flyTo({ center: coords, zoom: 10 });
      }
    }
  };

  const handleEndLocationChange = async (value: string) => {
    setEndInput(value);
    
    const coords = await geocodeAddress(value);
    if (coords) {
      setEndLocation(coords);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const currentLocation: [number, number] = [position.coords.longitude, position.coords.latitude];
          setStartLocation(currentLocation);
          
          if (map) {
            map.flyTo({ center: currentLocation, zoom: 12 });
          }

          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${currentLocation[0]},${currentLocation[1]}.json?access_token=${apiKey}`
            );
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              const address = data.features[0].place_name;
              setStartInput(address);
              onStartLocationChanged?.(address);
            }
          } catch (error) {
            console.error("Reverse geocoding error:", error);
          }
        },
        () => alert("Unable to fetch current location.")
      );
    }
  };

  useEffect(() => {
    if (startLocation && endLocation) calculateRoute();
  }, [startLocation, endLocation, waypoints, calculateRoute]);

  useEffect(() => {
    if (map && route) {
      const source = map.getSource('route') as any;
      if (!source) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          }
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4
          }
        });
      } else {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: route.geometry
        });
      }
    }
  }, [map, route]);

  useImperativeHandle(ref, () => ({ calculateRouteWithStops }));

  return (
    <div className={cn("relative h-full min-h-[400px] rounded-xl overflow-hidden", className)}>
      <Map
        mapboxAccessToken={apiKey}
        initialViewState={{
          longitude: defaultCenter.lng,
          latitude: defaultCenter.lat,
          zoom: 10
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onLoad={(evt) => setMap(evt.target)}
        reuseMaps
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        
        {startLocation && (
          <Marker longitude={startLocation[0]} latitude={startLocation[1]} anchor="bottom">
            <div className="bg-green-500 rounded-full p-2 shadow-lg">
              <MapPin className="h-4 w-4 text-white" />
            </div>
          </Marker>
        )}
        
        {endLocation && (
          <Marker longitude={endLocation[0]} latitude={endLocation[1]} anchor="bottom">
            <div className="bg-red-500 rounded-full p-2 shadow-lg">
              <MapPin className="h-4 w-4 text-white" />
            </div>
          </Marker>
        )}
        
        {gasStops.map((stop, index) => (
          <Marker
            key={index}
            longitude={stop.position[0]}
            latitude={stop.position[1]}
            anchor="bottom"
          >
            <div className="bg-yellow-500 rounded-full p-2 shadow-lg">
              <MapPin className="h-4 w-4 text-white" />
            </div>
          </Marker>
        ))}
      </Map>
      
      {/* Map Overlay Controls - Top Left, Smaller, More Transparent */}
      <div className="absolute top-4 left-4 w-80 space-y-2">
        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg p-3 space-y-2 border border-white/20">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Start Location"
              value={startInput || startLocationValue || ""}
              onChange={(e) => handleStartLocationChange(e.target.value)}
              className="flex-1 bg-white/50 backdrop-blur-sm border-white/30 text-gray-900 placeholder-gray-600"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleUseCurrentLocation}
              title="Use Current Location"
              className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
          
          <Input 
            placeholder="Destination" 
            value={endInput}
            onChange={(e) => handleEndLocationChange(e.target.value)}
            className="w-full bg-white/50 backdrop-blur-sm border-white/30 text-gray-900 placeholder-gray-600"
          />
          
          <Button 
            onClick={() => {
              calculateRouteWithStops();
              onGoClick?.();
            }}
            disabled={loading || !startLocation || !endLocation || !adjustedRange}
            className="w-full bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70 text-gray-900"
          >
            {loading ? "Calculating..." : "Calculate Route"}
          </Button>
        </div>
      </div>
    </div>
  );
});

MapboxComponent.displayName = 'MapboxComponent';

export interface MapboxComponentRef {
  calculateRouteWithStops: () => void;
}

export default MapboxComponent;
