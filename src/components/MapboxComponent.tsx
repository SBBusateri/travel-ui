import { useEffect, useState, useImperativeHandle, forwardRef, useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";
import { Feature, LineString } from "geojson";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Navigation, X, Plus, Loader2, MapPin, Car, Clock, Fuel, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Suppress Mapbox vector tile errors in console
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && 
      (message.includes('mapbox.mapbox-incidents-v1') || 
       message.includes('.vector.pbf') ||
       message.includes('mapbox.traffic-incident'))) {
    // Suppress Mapbox internal vector tile errors
    return;
  }
  originalConsoleError.apply(console, args);
};

// Also suppress network error logs for Mapbox vector tiles
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && 
      (message.includes('mapbox.mapbox-incidents-v1') || 
       message.includes('.vector.pbf') ||
       message.includes('mapbox.traffic-incident'))) {
    // Suppress Mapbox internal vector tile warnings
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Custom Locate Me Control
class LocateMeControl {
  _map: mapboxgl.Map;
  _container: HTMLElement;
  _onClick: () => void;

  constructor(onClick: () => void) {
    this._onClick = onClick;
  }

  onAdd(map: mapboxgl.Map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    this._container.innerHTML = `
      <button class="mapboxgl-ctrl-icon" type="button" title="My Location" aria-label="My Location">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    `;
    
    this._container.querySelector('button')?.addEventListener('click', this._onClick);
    return this._container;
  }

  onRemove() {
    this._container?.remove();
  }
}

// Custom Fullscreen Control
class FullscreenControl {
  _map: mapboxgl.Map;
  _container: HTMLElement;
  _isFullscreen: boolean = false;

  onAdd(map: mapboxgl.Map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    this._container.innerHTML = `
      <button class="mapboxgl-ctrl-icon" type="button" title="Toggle Fullscreen" aria-label="Toggle Fullscreen">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 3H5C4.46957 3 3.96086 3.21071 3.58579 3.58579C3.21071 3.96086 3 4.46957 3 5V8M21 8V5C21 4.46957 20.7893 3.96086 20.4142 3.58579C20.0391 3.21071 19.5304 3 19 3H16M16 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V16M3 16V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    `;
    
    this._container.querySelector('button')?.addEventListener('click', () => this._toggleFullscreen());
    return this._container;
  }

  _toggleFullscreen() {
    if (!this._isFullscreen) {
      if (this._map.getContainer().requestFullscreen) {
        this._map.getContainer().requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    this._isFullscreen = !this._isFullscreen;
  }

  onRemove() {
    this._container?.remove();
  }
}

// Global rate limiter for Mapbox API calls - MUCH stricter
class RateLimiter {
  private calls: number[] = [];
  private readonly maxCallsPerSecond: number;
  private readonly maxCallsPerMinute: number;

  constructor(maxCallsPerSecond = 5, maxCallsPerMinute = 100) {
    this.maxCallsPerSecond = maxCallsPerSecond;
    this.maxCallsPerMinute = maxCallsPerMinute;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Clean old calls (older than 1 minute)
    this.calls = this.calls.filter(callTime => now - callTime < 60000);
    
    // Check per-minute limit
    if (this.calls.length >= this.maxCallsPerMinute) {
      const oldestCall = Math.min(...this.calls);
      const waitTime = 60000 - (now - oldestCall);
      if (waitTime > 0) {
        console.log(`Rate limit: Waiting ${waitTime}ms for per-minute limit`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Check per-second limit
    const recentCalls = this.calls.filter(callTime => now - callTime < 1000);
    if (recentCalls.length >= this.maxCallsPerSecond) {
      console.log(`Rate limit: Waiting 1000ms for per-second limit`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.calls.push(Date.now());
    console.log(`Rate limit: API call #${this.calls.length} in last minute, ${recentCalls.length + 1} in last second`);
  }
}

// API response cache to prevent duplicate calls
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const normalizeCacheText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const getCachedData = (key: string) => {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Cache hit for: ${key}`);
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  apiCache.set(key, { data, timestamp: Date.now() });
  console.log(`Cached data for: ${key}`);
};

const mapboxRateLimiter = new RateLimiter();

type GasStop = {
  id: string;
  name: string;
  position: [number, number];
  distanceFromStart: number;
  distanceFromLast?: number;
  vicinity?: string;
  price?: string;
  estimatedArrival?: string;
  fuelRemaining?: number;
};

type AutocompleteSuggestion = {
  place_name: string;
  center: [number, number];
  text: string;
};

type Props = {
  start?: string;
  end?: string;
  stops?: string[];
  vehicleRangeMiles?: number;
  onGasStopsCalculated?: (stops: GasStop[]) => void;
  onDistanceCalculated?: (distance: number) => void;
  onStartLocationChanged?: (location: string) => void;
  onEndLocationChanged?: (location: string) => void;
  onStopChange?: (index: number, location: string) => void;
  onAddStop?: () => void;
  onRemoveStop?: (index: number) => void;
  startLocationValue?: string;
  endLocationValue?: string;
  stopValues?: string[];
  onGoClick?: () => void;
  adjustedRange?: number;
  vehicleMPG?: number;
  onPredictedGasStopsCalculated?: (stops: GasStop[]) => void;
  apiKey?: string;
};

export interface MapboxComponentRef {
  calculateRouteWithStops: () => void;
}

const MapboxComponent = forwardRef<MapboxComponentRef, Props>((props, ref) => {
  const {
    start,
    end,
    stops = [],
    vehicleRangeMiles,
    onGasStopsCalculated,
    onDistanceCalculated,
    onStartLocationChanged,
    onEndLocationChanged,
    onStopChange,
    onAddStop,
    onRemoveStop,
    startLocationValue,
    endLocationValue,
    stopValues = [],
    onGoClick,
    adjustedRange,
    vehicleMPG,
    onPredictedGasStopsCalculated,
    apiKey
  } = props;

  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [startInput, setStartInput] = useState(startLocationValue || start || "");
  const [endInput, setEndInput] = useState(endLocationValue || end || "");
  const [stopInputs, setStopInputs] = useState<string[]>(stopValues);
  const [startSuggestions, setStartSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [stopSuggestions, setStopSuggestions] = useState<AutocompleteSuggestion[][]>([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [showStopSuggestions, setShowStopSuggestions] = useState<boolean[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [startError, setStartError] = useState<string>("");
  const [endError, setEndError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Debounce refs for API calls
  const startInputRef = useRef<NodeJS.Timeout>();
  const endInputRef = useRef<NodeJS.Timeout>();
  const stopInputRefs = useRef<NodeJS.Timeout[]>([]);
  const isCalculatingRoute = useRef(false);
  const lastRouteCalculation = useRef<number>(0);

  // Map control functions
  const zoomIn = () => {
    if (map) map.zoomIn();
  };

  const zoomOut = () => {
    if (map) map.zoomOut();
  };

  const resetView = () => {
    if (map) {
      map.flyTo({ center: [-90, 38], zoom: 4, speed: 1.2 });
    }
  };

  const centerOnRoute = () => {
    if (map && startInput && endInput) {
      // This will be called after route is calculated
      const bounds = new mapboxgl.LngLatBounds();
      // We'll implement this after route calculation
    }
  };

  // Autocomplete function with caching
  const getAutocompleteSuggestions = async (query: string, userCoords?: [number, number]): Promise<AutocompleteSuggestion[]> => {
    if (!query || query.length < 2) return [];
 
    const normalizedQuery = normalizeCacheText(query);
    const cacheKey = `autocomplete_${normalizedQuery}_${userCoords?.[0] || 'null'}_${userCoords?.[1] || 'null'}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      setLoadingSuggestions(true);
      
      // Wait for rate limiter
      await mapboxRateLimiter.waitForSlot();
      
      const url = userCoords
        ? `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?proximity=${userCoords[0]},${userCoords[1]}&limit=5&access_token=${mapboxgl.accessToken}`
        : `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=5&access_token=${mapboxgl.accessToken}`;

      const response = await fetch(url);
      const data = await response.json();
      
      const suggestions = data.features.map((feature: any) => ({
        text: feature.text,
        place_name: feature.place_name,
        center: feature.center,
      }));
      
      // Cache the results
      setCachedData(cacheKey, suggestions);
      
      return suggestions;
    } catch (error) {
      console.error("Autocomplete error:", error);
      return [];
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Address validation with coordinate validation
  const validateAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      const normalizedAddress = normalizeCacheText(address);
      const cacheKey = `validate_${normalizedAddress}`;
      const cached = getCachedData(cacheKey);
      if (cached) {
        return cached as [number, number];
      }

      // Wait for rate limiter
      await mapboxRateLimiter.waitForSlot();
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(normalizedAddress)}.json?access_token=${mapboxgl.accessToken}&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const coords = data.features[0].center as [number, number];
        
        // Validate coordinate ranges
        const [lng, lat] = coords;
        if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          console.error('Invalid coordinates:', coords);
          return null;
        }
        
        setCachedData(cacheKey, coords);
        return coords;
      }
      return null;
    } catch (error) {
      console.error("Address validation error:", error);
      return null;
    }
  };

  // User location detection
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const currentLocation: [number, number] = [position.coords.longitude, position.coords.latitude];
          setUserLocation(currentLocation);
          
          // Reverse geocode to get address
          try {
            const cacheKey = `reverse_${currentLocation[0].toFixed(5)}_${currentLocation[1].toFixed(5)}`;
            const cached = getCachedData(cacheKey);
            if (cached) {
              const address = cached as string;
              setStartInput(address);
              onStartLocationChanged?.(address);
              setStartError("");

              if (map) {
                map.flyTo({ center: currentLocation, zoom: 12 });
              }
              return;
            }

            // Wait for rate limiter
            await mapboxRateLimiter.waitForSlot();
            
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${currentLocation[0]},${currentLocation[1]}.json?access_token=${mapboxgl.accessToken}`
            );
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              const address = data.features[0].place_name;
              setCachedData(cacheKey, address);
              setStartInput(address);
              onStartLocationChanged?.(address);
              setStartError("");
              
              if (map) {
                map.flyTo({ center: currentLocation, zoom: 12 });
              }
            }
          } catch (error) {
            console.error("Reverse geocoding error:", error);
            setStartError("Could not get address from current location");
          }
        },
        () => {
          setStartError("Unable to fetch current location");
        }
      );
    } else {
      setStartError("Geolocation is not supported by your browser");
    }
  };

  // Handle input changes with autocomplete and debouncing
  const handleStartInputChange = (value: string) => {
    setStartInput(value);
    setStartError("");
    onStartLocationChanged?.(value);
    
    // Clear existing timeout
    if (startInputRef.current) {
      clearTimeout(startInputRef.current);
    }
    
    if (value.length >= 2) {
      // Debounce API call by 1000ms (increased from 500ms)
      startInputRef.current = setTimeout(async () => {
        const suggestions = await getAutocompleteSuggestions(value, userLocation);
        setStartSuggestions(suggestions);
        setShowStartSuggestions(suggestions.length > 0);
      }, 1000);
    } else {
      setStartSuggestions([]);
      setShowStartSuggestions(false);
    }
  };

  const handleEndInputChange = (value: string) => {
    setEndInput(value);
    setEndError("");
    onEndLocationChanged?.(value);
    
    // Clear existing timeout
    if (endInputRef.current) {
      clearTimeout(endInputRef.current);
    }
    
    if (value.length >= 2) {
      // Debounce API call by 1000ms (increased from 500ms)
      endInputRef.current = setTimeout(async () => {
        const suggestions = await getAutocompleteSuggestions(value, userLocation);
        setEndSuggestions(suggestions);
        setShowEndSuggestions(suggestions.length > 0);
      }, 1000);
    } else {
      setEndSuggestions([]);
      setShowEndSuggestions(false);
    }
  };

  // Select suggestion
  const selectStartSuggestion = (suggestion: AutocompleteSuggestion) => {
    setStartInput(suggestion.place_name);
    setStartSuggestions([]);
    setShowStartSuggestions(false);
    setStartError("");
    onStartLocationChanged?.(suggestion.place_name);
    
    if (map) {
      map.flyTo({ center: suggestion.center, zoom: 10 });
    }
  };

  const selectEndSuggestion = (suggestion: AutocompleteSuggestion) => {
    setEndInput(suggestion.place_name);
    setEndSuggestions([]);
    setShowEndSuggestions(false);
    setEndError("");
    onEndLocationChanged?.(suggestion.place_name);
    
    if (map) {
      map.flyTo({ center: suggestion.center, zoom: 10 });
    }
  };

  // Handle stop input changes with autocomplete and debouncing
  const handleStopInputChange = (index: number, value: string) => {
    const newStopInputs = [...stopInputs];
    newStopInputs[index] = value;
    setStopInputs(newStopInputs);
    onStopChange?.(index, value);
    
    // Clear existing timeout for this stop
    if (stopInputRefs.current[index]) {
      clearTimeout(stopInputRefs.current[index]);
    }
    
    if (value.length >= 2) {
      // Debounce API call by 1000ms (increased from 500ms)
      stopInputRefs.current[index] = setTimeout(async () => {
        const suggestions = await getAutocompleteSuggestions(value, userLocation);
        const newStopSuggestions = [...stopSuggestions];
        newStopSuggestions[index] = suggestions;
        setStopSuggestions(newStopSuggestions);
        
        const newShowSuggestions = [...showStopSuggestions];
        newShowSuggestions[index] = suggestions.length > 0;
        setShowStopSuggestions(newShowSuggestions);
      }, 1000);
    } else {
      const newStopSuggestions = [...stopSuggestions];
      newStopSuggestions[index] = [];
      setStopSuggestions(newStopSuggestions);
      
      const newShowSuggestions = [...showStopSuggestions];
      newShowSuggestions[index] = false;
      setShowStopSuggestions(newShowSuggestions);
    }
  };

  // Select stop suggestion
  const selectStopSuggestion = (index: number, suggestion: AutocompleteSuggestion) => {
    const newStopInputs = [...stopInputs];
    newStopInputs[index] = suggestion.place_name;
    setStopInputs(newStopInputs);
    
    const newStopSuggestions = [...stopSuggestions];
    newStopSuggestions[index] = [];
    setStopSuggestions(newStopSuggestions);
    
    const newShowSuggestions = [...showStopSuggestions];
    newShowSuggestions[index] = false;
    setShowStopSuggestions(newShowSuggestions);
    
    onStopChange?.(index, suggestion.place_name);
    
    if (map) {
      map.flyTo({ center: suggestion.center, zoom: 10 });
    }
  };

  // Add stop
  const addStop = () => {
    const newStopInputs = [...stopInputs, ""];
    setStopInputs(newStopInputs);
    onAddStop?.();
  };

  // Remove stop
  const removeStop = (index: number) => {
    const newStopInputs = stopInputs.filter((_, i) => i !== index);
    setStopInputs(newStopInputs);
    onRemoveStop?.(index);
  };

  // Simple retry wrapper for API calls
  const fetchWithRetry = async (url: string, maxRetries = 2): Promise<Response> => {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        await mapboxRateLimiter.waitForSlot();
        const response = await fetch(url);
        
        if (response.ok) {
          return response;
        }
        
        // Don't retry on client errors (4xx), only on server errors (5xx) and rate limits
        if (response.status >= 400 && response.status < 500) {
          return response;
        }
        
        if (i < maxRetries) {
          console.log(`Retrying request (attempt ${i + 2}):`, url);
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
      } catch (error) {
        if (i === maxRetries) throw error;
        console.log(`Retry ${i + 1} failed, trying again...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    throw new Error('Max retries exceeded');
  };

  // Declare functions before useImperativeHandle
  const calculateRoute = useCallback(async () => {
    if (!startInput || !endInput) {
      if (!startInput) setStartError("Please enter a starting location");
      if (!endInput) setEndError("Please enter a destination");
      return;
    }

    // Prevent multiple simultaneous route calculations
    if (isCalculatingRoute.current) {
      console.log('Route calculation already in progress, skipping...');
      return;
    }

    isCalculatingRoute.current = true;
    setIsLoading(true);
    setStartError("");
    setEndError("");

    try {
      // Wait for rate limiter
      await mapboxRateLimiter.waitForSlot();

      // Validate addresses
      const startCoords = await validateAddress(startInput);
      const endCoords = await validateAddress(endInput);

      if (!startCoords) {
        setStartError("Invalid starting location. Please select from suggestions.");
        setIsLoading(false);
        isCalculatingRoute.current = false;
        return;
      }

      if (!endCoords) {
        setEndError("Invalid destination. Please select from suggestions.");
        setIsLoading(false);
        isCalculatingRoute.current = false;
        return;
      }

      const directionsCacheKey = `directions_${startCoords[0].toFixed(5)}_${startCoords[1].toFixed(5)}_${endCoords[0].toFixed(5)}_${endCoords[1].toFixed(5)}`;
      const cachedDirections = getCachedData(directionsCacheKey);
      if (cachedDirections) {
        const route = (cachedDirections as any).routes[0];
        const line = turf.lineString(route.geometry.coordinates);
        drawRoute(line);

        const gasStops = await predictGasStops(line, route.distance / 1609.34);
        drawGasMarkers(gasStops);
        onGasStopsCalculated?.(gasStops);
        onDistanceCalculated?.(route.distance / 1609.34);

        if (map) {
          const bounds = new mapboxgl.LngLatBounds();
          route.geometry.coordinates.forEach((coord: [number, number]) => {
            bounds.extend(coord);
          });
          map.fitBounds(bounds, { padding: 50 });
        }

        setIsLoading(false);
        isCalculatingRoute.current = false;
        return;
      }

      // Wait for rate limiter for directions API
      await mapboxRateLimiter.waitForSlot();

      const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

      console.log('Requesting directions:', directionsUrl);

      const res = await fetchWithRetry(directionsUrl);
      
      if (!res.ok) {
        console.error('Directions API error:', res.status, res.statusText);
        throw new Error(`Directions API failed: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();

      if (data.message || data.error) {
        console.error('Directions API error response:', data);
        setStartError("Could not calculate route. Please try different locations.");
        setEndError("Could not calculate route. Please try different locations.");
        setIsLoading(false);
        isCalculatingRoute.current = false;
        return;
      }

      const route = data.routes[0];
      console.log('Route calculated successfully:', route);

      setCachedData(directionsCacheKey, data);

      const line = turf.lineString(route.geometry.coordinates);
      drawRoute(line);
      
      console.log('Starting gas stop prediction...');
      const gasStops = await predictGasStops(line, route.distance / 1609.34);
      console.log('Gas stops prediction completed:', gasStops);
      
      drawGasMarkers(gasStops);
      onGasStopsCalculated?.(gasStops);
      onDistanceCalculated?.(route.distance / 1609.34);

      // Fit map to route
      if (map) {
        const bounds = new mapboxgl.LngLatBounds();
        route.geometry.coordinates.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
        map.fitBounds(bounds, { padding: 50 });
      }

    } catch (error) {
      console.error("Route calculation error:", error);
      setStartError("Failed to calculate route. Please try again.");
      setEndError("Failed to calculate route. Please try again.");
    } finally {
      setIsLoading(false);
      isCalculatingRoute.current = false;
    }
  }, [startInput, endInput, onGasStopsCalculated, onDistanceCalculated, map]);

  function drawRoute(line: Feature<LineString>) {
    if (map!.getSource("route")) {
      (map!.getSource("route") as mapboxgl.GeoJSONSource).setData(line);
      return;
    }

    map!.addSource("route", { type: "geojson", data: line });
    map!.addLayer({
      id: "route",
      type: "line",
      source: "route",
      paint: {
        "line-color": "#3b82f6",
        "line-width": 6,
        "line-blur": 1,
      },
      layout: {
        "line-cap": "round",
        "line-join": "round"
      }
    });

    // Add route shadow for depth
    map!.addLayer({
      id: "route-shadow",
      type: "line",
      source: "route",
      paint: {
        "line-color": "#1e40af",
        "line-width": 8,
        "line-blur": 2,
        "line-opacity": 0.3
      },
      layout: {
        "line-cap": "round",
        "line-join": "round"
      }
    });
  }

  async function predictGasStops(
    routeLine: Feature<LineString>,
    totalDistanceMiles: number
  ): Promise<GasStop[]> {
    const range = vehicleRangeMiles || adjustedRange || 300;
    const adjusted = Math.max(50, range - 50);

    // Window around the target (miles)
    const WINDOW_BEFORE = 20;
    const WINDOW_AFTER = 10;

    // Hard cap to avoid infinite loops
    const MAX_STOPS = 10;

    const stops: GasStop[] = [];

    // If we can make it without stops, don't search at all
    if (totalDistanceMiles <= adjusted) {
      return stops;
    }

    // Helper to get a coordinate along the route at a specific mile marker
    const alongCoord = (milesFromStart: number): [number, number] => {
      const clamped = Math.max(0, Math.min(totalDistanceMiles, milesFromStart));
      const pt = turf.along(routeLine as any, clamped, { units: 'miles' }) as any;
      return pt.geometry.coordinates as [number, number];
    };

    // 1) First stop: closest gas station near the start
    const startCoord = alongCoord(0);
    const firstStop = await findBestGasStation(routeLine, startCoord, 0, 0, adjusted + WINDOW_AFTER);
    if (firstStop) {
      stops.push(firstStop);
    }

    // Track how far along the route we are (in miles from start)
    let lastStopMile = firstStop?.distanceFromStart ?? 0;

    // 2) Repeatedly step forward by adjusted range and search near that target.
    // IMPORTANT: keep API calls under control => at most 1 POI request per stop.
    while (stops.length < MAX_STOPS) {
      const remaining = totalDistanceMiles - lastStopMile;
      if (remaining <= adjusted) {
        break;
      }

      const targetMile = lastStopMile + adjusted;
      // Clamp the target to the route length, then search near that point.
      // The "window" is applied conceptually; with Mapbox POI we search nearest to the target.
      const clampedTarget = Math.max(0, Math.min(totalDistanceMiles, targetMile));
      const coord = alongCoord(clampedTarget);
      const found = await findBestGasStation(
        routeLine,
        coord,
        clampedTarget,
        Math.max(0, clampedTarget - WINDOW_BEFORE),
        Math.min(totalDistanceMiles, clampedTarget + WINDOW_AFTER)
      );

      if (!found) {
        break;
      }

      // distanceFromLast
      const prevMile = lastStopMile;
      found.distanceFromLast = Math.max(0, Math.round(found.distanceFromStart - prevMile));

      stops.push(found);
      lastStopMile = found.distanceFromStart;

      // Defensive: if we didn't make progress, stop.
      if (lastStopMile <= prevMile + 1) {
        break;
      }
    }

    return stops;
  }

  async function findBestGasStation(
    routeLine: Feature<LineString>,
    position: [number, number],
    targetMile: number,
    minMile: number,
    maxMile: number
  ): Promise<GasStop | null> {
    try {
      const roundedLng = position[0].toFixed(4);
      const roundedLat = position[1].toFixed(4);
      const cacheKey = `gas_${roundedLng}_${roundedLat}_${Math.round(minMile)}_${Math.round(maxMile)}`;
      const cached = getCachedData(cacheKey);
      if (cached) {
        const stop = cached as GasStop;
        return {
          ...stop,
          distanceFromStart: Math.round(targetMile),
        };
      }

      // Use Mapbox Geocoding POI search near the target coordinate.
      // Note: results depend on Mapbox's POI coverage for the area.
      await mapboxRateLimiter.waitForSlot();

      const query = 'gas station';
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=poi&proximity=${position[0]},${position[1]}&limit=5&autocomplete=false&access_token=${mapboxgl.accessToken}`;

      const res = await fetchWithRetry(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          // Choose a result that lands within [minMile, maxMile] along the route.
          // This enforces: target range - 20 miles to +10 miles.
          let bestFeature: any | null = null;
          let bestAlongMile = 0;
          let bestDelta = Number.POSITIVE_INFINITY;

          for (const f of data.features) {
            if (!f?.center) continue;
            const p = turf.point(f.center);
            const snapped = turf.nearestPointOnLine(routeLine as any, p, { units: 'miles' }) as any;
            const along = typeof snapped?.properties?.location === 'number' ? snapped.properties.location : null;
            if (along === null) continue;
            if (along < minMile || along > maxMile) continue;

            const delta = Math.abs(along - targetMile);
            if (delta < bestDelta) {
              bestDelta = delta;
              bestFeature = f;
              bestAlongMile = along;
            }
          }

          // If none are within window, fall back to the closest-to-target POINT-wise
          if (!bestFeature) {
            const targetPt = turf.point(position);
            let bestDist = Number.POSITIVE_INFINITY;
            for (const f of data.features) {
              if (!f?.center) continue;
              const d = turf.distance(targetPt, turf.point(f.center), { units: 'miles' });
              if (d < bestDist) {
                bestDist = d;
                bestFeature = f;
              }
            }
            bestAlongMile = targetMile;
          }

          const stop: GasStop = {
            id: bestFeature.id || `gas-${roundedLng}-${roundedLat}`,
            name: bestFeature.text || bestFeature.place_name || 'Gas Station',
            position: bestFeature.center as [number, number],
            distanceFromStart: Math.round(bestAlongMile),
            vicinity: bestFeature.place_name,
            price: (Math.random() * 0.5 + 3.5).toFixed(2),
            estimatedArrival: new Date(Date.now() + bestAlongMile * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fuelRemaining: Math.max(0, 50 - (bestAlongMile % 200)),
          };

          setCachedData(cacheKey, stop);
          return stop;
        }
      }

    } catch (error) {
      console.error('Error finding gas station:', error);
      return null;
    }
  }

  function drawGasMarkers(stops: GasStop[]) {
    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.gas-marker');
    existingMarkers.forEach(marker => marker.remove());

    stops.forEach((stop, index) => {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'gas-marker';
      el.innerHTML = `
        <div class="relative group">
          <div class="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white hover:bg-red-600 transition-colors cursor-pointer">
            <Fuel class="w-4 h-4" />
            <span class="absolute -top-1 -right-1 bg-yellow-400 text-xs rounded-full w-3 h-3 flex items-center justify-center font-bold">${index + 1}</span>
          </div>
          <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div class="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
              <div class="font-semibold">${stop.name}</div>
              <div>${stop.distanceFromStart} mi • ${stop.price}/gal</div>
              <div class="text-gray-300">${stop.estimatedArrival}</div>
              <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div class="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        </div>
      `;

      new mapboxgl.Marker({ element: el })
        .setLngLat(stop.position)
        .setPopup(
          new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            className: 'gas-popup'
          }).setHTML(`
            <div class="p-3 min-w-[200px]">
              <div class="flex items-center gap-2 mb-2">
                <div class="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm">${index + 1}</div>
                <h3 class="font-bold text-gray-900">${stop.name}</h3>
              </div>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Distance:</span>
                  <span class="font-medium">${stop.distanceFromStart} mi</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Gas Price:</span>
                  <span class="font-medium text-green-600">$${stop.price}/gal</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">ETA:</span>
                  <span class="font-medium">${stop.estimatedArrival}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Fuel Left:</span>
                  <span class="font-medium text-orange-600">${stop.fuelRemaining?.toFixed(0)} mi</span>
                </div>
              </div>
              <div class="mt-2 pt-2 border-t border-gray-200">
                <div class="text-xs text-gray-500">${stop.vicinity}</div>
              </div>
            </div>
          `)
        )
        .addTo(map!);
    });
  }

  useImperativeHandle(ref, () => ({
    calculateRouteWithStops: () => {
      if (startInput && endInput) {
        calculateRoute();
      }
    }
  }));

  useEffect(() => {
    console.log('MapboxComponent: Initializing map');
    console.log('Token available:', !!mapboxgl.accessToken);
    console.log('Token value:', mapboxgl.accessToken?.substring(0, 10) + '...');
    
    if (!document.getElementById('map')) {
      console.error('MapboxComponent: Map container not found');
      return;
    }
    
    if (!mapboxgl.accessToken) {
      console.error('MapboxComponent: No access token provided');
      return;
    }
    
    try {
      const m = new mapboxgl.Map(({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-90, 38],
        zoom: 4,
        maxPitch: 0,
        pitchWithRotate: false,
        dragRotate: false,
        // Reduce the number of extra vector tiles fetched ahead of time
        prefetchZoomDelta: 0,
        attributionControl: false, // We'll add custom attribution
      } as any));

      // Add navigation control (compass)
      m.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add custom fullscreen control
      m.addControl(new FullscreenControl(), 'top-right');

      // Add scale control
      m.addControl(new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: 'imperial'
      }), 'bottom-left');

      m.on('load', () => {
        console.log('MapboxComponent: Map loaded successfully');
        setMap(m);
      });

      m.on('error', (e) => {
        console.error('MapboxComponent: Map error:', e);
      });

      return () => m.remove();
    } catch (error) {
      console.error('MapboxComponent: Failed to initialize map:', error);
    }
  }, []);

  // Sync state with props without triggering API calls
  useEffect(() => {
    if (startLocationValue !== undefined && startLocationValue !== startInput) {
      setStartInput(startLocationValue);
    }
  }, [startLocationValue]);

  useEffect(() => {
    if (endLocationValue !== undefined && endLocationValue !== endInput) {
      setEndInput(endLocationValue);
    }
  }, [endLocationValue]);

  useEffect(() => {
    if (stopValues !== undefined && stopValues !== stopInputs) {
      setStopInputs(stopValues);
    }
  }, [stopValues]);

  return (
    <div className="w-full h-full relative">
      <div id="map" className="w-full h-full" />
      {!map && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Location Inputs Overlay */}
      <div className="absolute top-4 left-4 w-80 space-y-2 z-10">
        <div className="bg-white/20 backdrop-blur-md rounded-lg shadow-lg p-3 space-y-2 border border-white/40">
          {/* Start Location Input */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Start Location"
                value={startInput}
                onChange={(e) => handleStartInputChange(e.target.value)}
                onFocus={() => setShowStartSuggestions(startSuggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowStartSuggestions(false), 200)}
                className={`flex-1 bg-white/50 backdrop-blur-sm border-white/30 text-gray-900 placeholder-gray-600 ${startError ? 'border-red-500' : ''}`}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleUseCurrentLocation}
                title="Use Current Location"
                className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
                disabled={isLoading}
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Start Error */}
            {startError && (
              <div className="text-red-500 text-xs mt-1">{startError}</div>
            )}
            
            {/* Autocomplete Dropdown for Start */}
            {showStartSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 z-50 max-h-48 overflow-y-auto">
                {loadingSuggestions ? (
                  <div className="p-3 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                  </div>
                ) : startSuggestions.length > 0 ? (
                  startSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => selectStartSuggestion(suggestion)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900">{suggestion.text}</div>
                      <div className="text-xs text-gray-600 truncate">{suggestion.place_name}</div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-gray-500">No suggestions found</div>
                )}
              </div>
            )}
          </div>
          
          {/* Stop Inputs */}
          {stopInputs.map((stopInput, index) => (
            <div key={index} className="relative">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={`Stop ${index + 1}`}
                  value={stopInput}
                  onChange={(e) => handleStopInputChange(index, e.target.value)}
                  onFocus={() => {
                    const newShowSuggestions = [...showStopSuggestions];
                    newShowSuggestions[index] = stopSuggestions[index]?.length > 0;
                    setShowStopSuggestions(newShowSuggestions);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      const newShowSuggestions = [...showStopSuggestions];
                      newShowSuggestions[index] = false;
                      setShowStopSuggestions(newShowSuggestions);
                    }, 200);
                  }}
                  className="flex-1 bg-white/50 backdrop-blur-sm border-white/30 text-gray-900 placeholder-gray-600"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeStop(index)}
                  title="Remove Stop"
                  className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Autocomplete Dropdown for Stop */}
              {showStopSuggestions[index] && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 z-50 max-h-48 overflow-y-auto">
                  {loadingSuggestions ? (
                    <div className="p-3 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                    </div>
                  ) : stopSuggestions[index]?.length > 0 ? (
                    stopSuggestions[index].map((suggestion, suggestionIndex) => (
                      <button
                        key={suggestionIndex}
                        onClick={() => selectStopSuggestion(index, suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="text-sm font-medium text-gray-900">{suggestion.text}</div>
                        <div className="text-xs text-gray-600 truncate">{suggestion.place_name}</div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-gray-500">No suggestions found</div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Add Stop Button */}
          <Button
            onClick={addStop}
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-gray-600 hover:text-gray-900 hover:bg-white/20 border border-dashed border-gray-400/30 hover:border-gray-400/50"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Stop
          </Button>
          
          {/* End Location Input */}
          <div className="relative">
            <Input 
              placeholder="Destination" 
              value={endInput}
              onChange={(e) => handleEndInputChange(e.target.value)}
              onFocus={() => setShowEndSuggestions(endSuggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowEndSuggestions(false), 200)}
              className={`w-full bg-white/50 backdrop-blur-sm border-white/30 text-gray-900 placeholder-gray-600 ${endError ? 'border-red-500' : ''}`}
            />
            
            {/* End Error */}
            {endError && (
              <div className="text-red-500 text-xs mt-1">{endError}</div>
            )}
            
            {/* Autocomplete Dropdown for End */}
            {showEndSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 z-50 max-h-48 overflow-y-auto">
                {loadingSuggestions ? (
                  <div className="p-3 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                  </div>
                ) : endSuggestions.length > 0 ? (
                  endSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => selectEndSuggestion(suggestion)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900">{suggestion.text}</div>
                      <div className="text-xs text-gray-600 truncate">{suggestion.place_name}</div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-gray-500">No suggestions found</div>
                )}
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 mr-2" />
              <span className="text-sm text-blue-600">Calculating route...</span>
            </div>
          )}

        </div>
      </div>

      {/* Map Controls - Right Side */}
      {/* Removed - using built-in Mapbox controls instead */}

      {/* Map Attribution - Bottom Left */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-600 bg-white/80 backdrop-blur-sm px-2 py-1 rounded z-10">
        <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer" className="hover:underline">
          © Mapbox
        </a>
        <span className="mx-1">•</span>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">
          © OpenStreetMap
        </a>
      </div>
    </div>
  );
});

MapboxComponent.displayName = 'MapboxComponent';

export default MapboxComponent;
