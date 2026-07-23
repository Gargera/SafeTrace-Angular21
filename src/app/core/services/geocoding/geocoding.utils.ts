export const COORDINATE_PRECISION_DECIMALS = 4;

export function generateCoordinateCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(COORDINATE_PRECISION_DECIMALS)},${longitude.toFixed(COORDINATE_PRECISION_DECIMALS)}`;
}

export function formatFallbackAddress(latitude: number, longitude: number): string {
  return `${latitude.toFixed(COORDINATE_PRECISION_DECIMALS)}, ${longitude.toFixed(COORDINATE_PRECISION_DECIMALS)}`;
}
