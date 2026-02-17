import { useRef, useEffect } from 'react';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { MapLocation } from '@/types/googleMaps';
import { calculateRoute } from '@/components/routeService';
import { upsertMarker, MarkerCollection } from '@/components/mapMarkers';

interface GoogleMapComponentProps {
  startLocation: MapLocation | null;
  destinationLocation: MapLocation | null;
  onRouteCalculated?: (route: google.maps.DirectionsResult) => void;
  onMapReady?: (map: google.maps.Map) => void;
  className?: string;
}

const GoogleMapComponent = ({
  startLocation,
  destinationLocation,
  onRouteCalculated,
  onMapReady,
  className = ''
}: GoogleMapComponentProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const markersRef = useRef<MarkerCollection>({});
  const lastRouteRequestRef = useRef<string | null>(null);

  const { isLoaded, error } = useGoogleMapsLoader(
    import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_API_KEY
  );

  // Initialize map once
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 39.8283, lng: -98.5795 },
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false
    });

    mapInstanceRef.current = map;
    directionsServiceRef.current = new google.maps.DirectionsService();
    directionsRendererRef.current = new google.maps.DirectionsRenderer({ map });

    onMapReady?.(map);
  }, [isLoaded, onMapReady]);

  // Update markers when inputs change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    upsertMarker(
      'start',
      startLocation
        ? { lat: startLocation.lat, lng: startLocation.lng }
        : null,
      map,
      markersRef
    );

    upsertMarker(
      'destination',
      destinationLocation
        ? { lat: destinationLocation.lat, lng: destinationLocation.lng }
        : null,
      map,
      markersRef
    );
  }, [startLocation, destinationLocation]);

  // Calculate and render routes when both locations are available
  useEffect(() => {
    const directionsService = directionsServiceRef.current;
    const directionsRenderer = directionsRendererRef.current;

    if (!directionsService || !directionsRenderer) return;

    if (!startLocation || !destinationLocation) {
      lastRouteRequestRef.current = null;
      directionsRenderer.setDirections({ routes: [] } as google.maps.DirectionsResult);
      return;
    }

    const origin = { lat: startLocation.lat, lng: startLocation.lng };
    const destination = { lat: destinationLocation.lat, lng: destinationLocation.lng };
    const cacheKey = `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}`;

    if (lastRouteRequestRef.current === cacheKey) return;
    lastRouteRequestRef.current = cacheKey;

    void (async () => {
      try {
        const result = await calculateRoute(directionsService, origin, destination);
        directionsRenderer.setDirections(result);
        onRouteCalculated?.(result);
      } catch (err) {
        console.error('Route error:', err);
        lastRouteRequestRef.current = null;
      }
    })();
  }, [startLocation, destinationLocation, onRouteCalculated]);

  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!isLoaded) return <div className="p-4">Loading map...</div>;

  return (
    <div
      ref={mapRef}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
};

export default GoogleMapComponent;
