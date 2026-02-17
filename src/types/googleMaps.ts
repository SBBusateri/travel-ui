export interface MapLocation {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
}

export interface GasStop {
  type: 'start' | 'fuel' | 'destination';
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  placeId?: string;
  distanceFromStartMiles: number;
  distanceFromLastMiles?: number;
}

export interface RouteData {
  distance: number;
  duration: number;
  geometry: google.maps.LatLng[];
}

export interface GoogleMapsInstance {
  directionsService: google.maps.DirectionsService;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface MapControlsProps {
  startLocation: MapLocation | null;
  destinationLocation: MapLocation | null;
  onStartLocationChange: (location: MapLocation | null) => void;
  onDestinationChange: (location: MapLocation | null) => void;
  stopLocation: MapLocation | null;
  onStopChange: (location: MapLocation | null) => void;
}

export interface MapComponentProps {
  startLocation: MapLocation | null;
  destinationLocation: MapLocation | null;
  stopLocation?: MapLocation | null;
  fuelStops?: GasStop[];
  onRouteCalculated?: (route: google.maps.DirectionsResult) => void;
  onMapReady?: (map: google.maps.Map) => void;
  className?: string;
}
