export function formatCoordinates(
  lat: number | null,
  lng: number | null,
  decimals = 4
): string {
  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    return '';
  }
  return `${lat.toFixed(decimals)}, ${lng.toFixed(decimals)}`;
}

export function isValidCoordinate(lat: number | null, lng: number | null): boolean {
  if (lat === null || lng === null) return false;
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
