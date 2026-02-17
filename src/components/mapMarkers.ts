type MarkerKey = 'start' | 'destination' | 'stop';

export type MarkerCollection = Partial<Record<MarkerKey, google.maps.Marker>>;

export const upsertMarker = (
  key: MarkerKey,
  location: { lat: number; lng: number } | null,
  map: google.maps.Map,
  markersRef: React.MutableRefObject<MarkerCollection>
) => {
  const existing = markersRef.current[key];

  if (!location) {
    if (existing) {
      existing.setMap(null);
      markersRef.current[key] = undefined;
    }
    return;
  }

  if (existing) {
    existing.setPosition(location);
    existing.setMap(map);
    return;
  }
  const titleMap: Record<MarkerKey, string> = {
    start: 'Start',
    destination: 'Destination',
    stop: 'Stop'
  };

  markersRef.current[key] = new google.maps.Marker({
    map,
    position: location,
    title: titleMap[key]
  });
};
