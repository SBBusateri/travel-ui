import { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { GoogleMap, LoadScript, Autocomplete, DirectionsRenderer, Marker } from "@react-google-maps/api";
import { MapPin, Navigation, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const libraries = ["places"] as any;
const mapContainerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 38.6270, lng: -90.1994 };

interface Stop {
  id: string;
  location: string;
  position?: google.maps.LatLng | null;
}

interface GoogleMapComponentProps {
  apiKey: string;
  onDistanceCalculated?: (distance: number) => void;
  adjustedRange?: number;
  onGasStopsCalculated?: (stops: any[]) => void;
  onStartLocationChanged?: (address: string) => void;
  startLocationValue?: string;
  onGoClick?: () => void;
  className?: string;
}

const GoogleMapComponent = forwardRef<GoogleMapComponentRef, GoogleMapComponentProps>(({
  apiKey,
  onDistanceCalculated,
  adjustedRange,
  onGasStopsCalculated,
  onStartLocationChanged,
  startLocationValue,
  onGoClick,
  className
}, ref) => {
  const [startLocation, setStartLocation] = useState<google.maps.LatLng | null>(null);
  const [endLocation, setEndLocation] = useState<google.maps.LatLng | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [startAutocomplete, setStartAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [endAutocomplete, setEndAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [gasStops, setGasStops] = useState<any[]>([]);
  const [waypoints, setWaypoints] = useState<google.maps.LatLng[]>([]);
  const [loading, setLoading] = useState(false);

  const onLoadStart = (autocomplete: google.maps.places.Autocomplete) => setStartAutocomplete(autocomplete);
  const onLoadEnd = (autocomplete: google.maps.places.Autocomplete) => setEndAutocomplete(autocomplete);

  const onPlaceChangedStart = () => {
    if (startAutocomplete) {
      const place = startAutocomplete.getPlace();
      if (place.geometry?.location) {
        const location = place.geometry.location;
        setStartLocation(location);
        if (map) map.panTo(location);
        const address = place.formatted_address || "Current Location";
        onStartLocationChanged?.(address);
      }
    }
  };

  const onPlaceChangedEnd = () => {
    if (endAutocomplete) {
      const place = endAutocomplete.getPlace();
      if (place.geometry?.location) {
        setEndLocation(place.geometry.location);
      }
    }
  };

  const findNearestGasStation = async (position: google.maps.LatLng, maxDistance = 5000): Promise<any> => {
    if (!map) return null;
    
    const placesService = new google.maps.places.PlacesService(map);
    return new Promise((resolve) => {
      placesService.nearbySearch(
        {
          location: position,
          radius: maxDistance,
          type: "gas_station",
        },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
            const nearest = results[0];
            resolve({
              position: nearest.geometry!.location,
              name: nearest.name,
              vicinity: nearest.vicinity,
              price: (Math.random() * 0.5 + 3.5).toFixed(2)
            });
          } else if (maxDistance < 32000) {
            findNearestGasStation(position, maxDistance + 5000).then(resolve);
          } else {
            resolve(null);
          }
        }
      );
    });
  };

  const calculateRoute = useCallback(() => {
    if (startLocation && endLocation && map) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: startLocation,
          destination: endLocation,
          waypoints: waypoints.map(wp => ({ location: wp, stopover: true })),
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            setDirections(result);
            const bounds = new google.maps.LatLngBounds();
            result.routes[0].overview_path.forEach(point => bounds.extend(point));
            map.fitBounds(bounds);
            const distanceMiles = parseFloat((result.routes[0].legs.reduce((total, leg) => total + leg.distance!.value, 0) * 0.000621371).toFixed(1));
            onDistanceCalculated?.(distanceMiles);
          }
        }
      );
    }
  }, [startLocation, endLocation, waypoints, map, onDistanceCalculated]);

  const calculateRouteWithStops = async () => {
    if (!startLocation || !endLocation || !map || !adjustedRange) return;

    setLoading(true);
    try {
      const directionsService = new google.maps.DirectionsService();
      
      // First get the basic route
      const basicRoute = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.route(
          {
            origin: startLocation,
            destination: endLocation,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
              resolve(result);
            } else {
              reject(status);
            }
          }
        );
      });

      const path = basicRoute.routes[0].overview_path;
      const distanceMiles = parseFloat((basicRoute.routes[0].legs.reduce((total, leg) => total + leg.distance!.value, 0) * 0.000621371).toFixed(1));
      onDistanceCalculated?.(distanceMiles);

      const safeRange = adjustedRange - 15;
      const preliminaryStops = [];
      let totalDistanceFromStart = 0;

      // Find first gas station near start
      const firstStop = await findNearestGasStation(startLocation, 5000);
      if (firstStop) {
        const firstStopDistance = google.maps.geometry.spherical.computeDistanceBetween(startLocation, firstStop.position) * 0.000621371;
        preliminaryStops.push({
          position: firstStop.position,
          distanceFromStart: firstStopDistance.toFixed(1),
          distanceFromLast: firstStopDistance.toFixed(1),
          name: firstStop.name,
          vicinity: firstStop.vicinity,
          price: firstStop.price
        });
        totalDistanceFromStart = firstStopDistance;
      }

      // Calculate gas stops along the route
      let pathIndex = 0;
      let lastStopPosition = firstStop?.position || startLocation;

      while (totalDistanceFromStart < distanceMiles) {
        let distanceCoveredSinceLast = 0;

        while (pathIndex < path.length && distanceCoveredSinceLast < safeRange) {
          if (pathIndex > 0) {
            const segmentDistance = google.maps.geometry.spherical.computeDistanceBetween(path[pathIndex - 1], path[pathIndex]) * 0.000621371;
            distanceCoveredSinceLast += segmentDistance;
            totalDistanceFromStart += segmentDistance;
          }
          pathIndex++;
        }

        if (pathIndex >= path.length) break;

        const targetPosition = path[pathIndex - 1];
        const stop = await findNearestGasStation(targetPosition, 5000);

        if (stop) {
          const distanceFromLast = google.maps.geometry.spherical.computeDistanceBetween(lastStopPosition, stop.position) * 0.000621371;
          preliminaryStops.push({
            position: stop.position,
            distanceFromStart: totalDistanceFromStart.toFixed(1),
            distanceFromLast: distanceFromLast.toFixed(1),
            name: stop.name,
            vicinity: stop.vicinity,
            price: stop.price
          });
          lastStopPosition = stop.position;
        }
      }

      // Update route with gas stops
      const updatedWaypoints = [
        ...waypoints.map(wp => ({ location: wp, stopover: true })),
        ...preliminaryStops.map(stop => ({ location: stop.position, stopover: true }))
      ];

      directionsService.route(
        {
          origin: startLocation,
          destination: endLocation,
          waypoints: updatedWaypoints,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (adjustedResult, adjustedStatus) => {
          if (adjustedStatus === google.maps.DirectionsStatus.OK) {
            setDirections(adjustedResult);
            const bounds = new google.maps.LatLngBounds();
            adjustedResult.routes[0].overview_path.forEach(point => bounds.extend(point));
            map.fitBounds(bounds);
          }
          setGasStops(preliminaryStops);
          onGasStopsCalculated?.(preliminaryStops);
          setLoading(false);
        }
      );
    } catch (error) {
      console.error("Error calculating route with stops:", error);
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
          setStartLocation(new google.maps.LatLng(currentLocation.lat, currentLocation.lng));
          if (map) map.panTo(currentLocation);
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: currentLocation }, (results, status) => {
            if (status === "OK" && results[0]) {
              onStartLocationChanged?.(results[0].formatted_address);
            }
          });
        },
        () => alert("Unable to fetch current location.")
      );
    }
  };

  useEffect(() => {
    if (startLocation && endLocation) calculateRoute();
  }, [startLocation, endLocation, waypoints, calculateRoute]);

  useImperativeHandle(ref, () => ({ calculateRouteWithStops }));

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={libraries}
      onLoad={() => console.log("Google Maps API loaded")}
    >
      <div className={cn("relative h-full min-h-[400px] rounded-xl overflow-hidden", className)}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={startLocation || defaultCenter}
          zoom={10}
          onLoad={setMap}
          options={{ 
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          }}
        >
          {directions && <DirectionsRenderer directions={directions} />}
          {gasStops.map((stop, index) => (
            <Marker
              key={index}
              position={stop.position}
              title={`Gas Stop ${index + 1}: ${stop.name} (${stop.distanceFromStart} miles)`}
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
                scaledSize: new google.maps.Size(32, 32)
              }}
            />
          ))}
        </GoogleMap>
        
        {/* Map Overlay Controls */}
        <div className="absolute top-4 left-4 right-4 space-y-3">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Autocomplete onLoad={onLoadStart} onPlaceChanged={onPlaceChangedStart}>
                <Input
                  placeholder="Start Location"
                  value={startLocationValue || ""}
                  onChange={(e) => onStartLocationChanged?.(e.target.value)}
                  className="flex-1"
                />
              </Autocomplete>
              <Button
                variant="outline"
                size="icon"
                onClick={handleUseCurrentLocation}
                title="Use Current Location"
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </div>
            
            <Autocomplete onLoad={onLoadEnd} onPlaceChanged={onPlaceChangedEnd}>
              <Input placeholder="Destination" className="w-full" />
            </Autocomplete>
            
            <Button 
              onClick={() => {
                calculateRouteWithStops();
                onGoClick?.();
              }}
              disabled={loading || !startLocation || !endLocation || !adjustedRange}
              className="w-full"
            >
              {loading ? "Calculating..." : "Calculate Route with Gas Stops"}
            </Button>
          </div>
        </div>
      </div>
    </LoadScript>
  );
});

GoogleMapComponent.displayName = 'GoogleMapComponent';

export interface GoogleMapComponentRef {
  calculateRouteWithStops: () => void;
}

export default GoogleMapComponent;
