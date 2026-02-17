export interface MarkerCollection {
  start?: google.maps.Marker;
  destination?: google.maps.Marker;
}

export const upsertMarker = (
  key: 'start' | 'destination',
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

  markersRef.current[key] = new google.maps.Marker({
    map,
    position: location,
    title: key === 'start' ? 'Start' : 'Destination'
  });
};
