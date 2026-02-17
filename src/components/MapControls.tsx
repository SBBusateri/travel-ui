import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MapLocation, MapControlsProps } from '@/types/googleMaps';

type UiSuggestion = {
  placeId: string;
  description: string;
};

const MapControls = ({
  startLocation,
  destinationLocation,
  onStartLocationChange,
  onDestinationChange
}: MapControlsProps) => {
  const [startInput, setStartInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [startSuggestions, setStartSuggestions] = useState<UiSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<UiSuggestion[]>([]);

  const startDebounceRef = useRef<number | null>(null);
  const destinationDebounceRef = useRef<number | null>(null);
  const startRequestIdRef = useRef(0);
  const destinationRequestIdRef = useRef(0);

  const sessionToken = useMemo(() => uuidv4(), []);

  const buildQueryParams = (params: Record<string, string>): string => {
    const query = new URLSearchParams({ ...params, sessionToken });
    return query.toString();
  };

  const fetchAutocomplete = async (input: string): Promise<UiSuggestion[]> => {
    const res = await fetch(`/api/places/autocomplete?${buildQueryParams({ input })}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Autocomplete failed');
    return data.suggestions || [];
  };

  const fetchDetails = async (placeId: string): Promise<MapLocation> => {
    const res = await fetch(`/api/places/details?${buildQueryParams({ placeId })}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Details failed');

    return {
      lat: data.location.latitude,
      lng: data.location.longitude,
      address: data.address,
      placeId
    };
  };

  const debounce = (callback: () => void, ref: MutableRefObject<number | null>) => {
    if (ref.current) window.clearTimeout(ref.current);
    ref.current = window.setTimeout(callback, 250);
  };

  const handleStartChange = (value: string) => {
    setStartInput(value);
    const trimmed = value.trim();

    if (!trimmed) {
      setStartSuggestions([]);
      onStartLocationChange(null);
      return;
    }

    if (trimmed.length < 3) {
      setStartSuggestions([]);
      return;
    }

    debounce(async () => {
      const requestId = ++startRequestIdRef.current;
      try {
        const suggestions = await fetchAutocomplete(trimmed);
        if (startRequestIdRef.current === requestId) {
          setStartSuggestions(suggestions);
        }
      } catch (err) {
        console.error('Start autocomplete failed:', err);
        if (startRequestIdRef.current === requestId) {
          setStartSuggestions([]);
        }
      }
    }, startDebounceRef);
  };

  const handleDestinationChange = (value: string) => {
    setDestinationInput(value);
    const trimmed = value.trim();

    if (!trimmed) {
      setDestinationSuggestions([]);
      onDestinationChange(null);
      return;
    }

    if (trimmed.length < 3) {
      setDestinationSuggestions([]);
      return;
    }

    debounce(async () => {
      const requestId = ++destinationRequestIdRef.current;
      try {
        const suggestions = await fetchAutocomplete(trimmed);
        if (destinationRequestIdRef.current === requestId) {
          setDestinationSuggestions(suggestions);
        }
      } catch (err) {
        console.error('Destination autocomplete failed:', err);
        if (destinationRequestIdRef.current === requestId) {
          setDestinationSuggestions([]);
        }
      }
    }, destinationDebounceRef);
  };

  const selectStart = async (suggestion: UiSuggestion) => {
    const location = await fetchDetails(suggestion.placeId);
    setStartInput(location.address);
    setStartSuggestions([]);
    onStartLocationChange(location);
  };

  const selectDestination = async (suggestion: UiSuggestion) => {
    const location = await fetchDetails(suggestion.placeId);
    setDestinationInput(location.address);
    setDestinationSuggestions([]);
    onDestinationChange(location);
  };

  useEffect(() => {
    if (startLocation) setStartInput(startLocation.address);
  }, [startLocation]);

  useEffect(() => {
    if (destinationLocation) setDestinationInput(destinationLocation.address);
  }, [destinationLocation]);

  useEffect(() => {
    return () => {
      if (startDebounceRef.current) window.clearTimeout(startDebounceRef.current);
      if (destinationDebounceRef.current) window.clearTimeout(destinationDebounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow-lg">
      {/* START INPUT */}
      <div>
        <label className="block text-sm font-medium mb-2">Starting Location</label>
        <div className="relative">
          <input
            value={startInput}
            onChange={(e) => handleStartChange(e.target.value)}
            placeholder="Enter starting address..."
            className="w-full px-4 py-2 border rounded-md"
          />
          {startSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {startSuggestions.map((s) => (
                <div
                  key={s.placeId}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    void selectStart(s);
                  }}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {s.description}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DESTINATION INPUT */}
      <div>
        <label className="block text-sm font-medium mb-2">Destination</label>
        <div className="relative">
          <input
            value={destinationInput}
            onChange={(e) => handleDestinationChange(e.target.value)}
            placeholder="Enter destination..."
            className="w-full px-4 py-2 border rounded-md"
          />
          {destinationSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {destinationSuggestions.map((s) => (
                <div
                  key={s.placeId}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    void selectDestination(s);
                  }}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {s.description}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapControls;
