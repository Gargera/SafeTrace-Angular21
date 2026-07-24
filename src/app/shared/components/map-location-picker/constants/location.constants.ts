import { MapCoordinates } from '../models/location.models';

export const DEFAULT_MAP_CENTER: MapCoordinates = {
  lat: 30.0444,
  lng: 31.2357,
};

export const DEFAULT_ZOOM = 13;
export const SELECT_ZOOM = 15;
export const RECENTER_ZOOM = 14;

export const SEARCH_DEBOUNCE_MS = 350;
export const LOCATION_TIMEOUT_MS = 8000;
export const LOCATION_SAFETY_GUARD_MS = 10000;
export const MAXIMUM_LOCATION_AGE_MS = 30000;
export const MAP_RESIZE_DEBOUNCE_MS = 200;
export const MAP_INIT_DELAY_MS = 120;
export const MAP_RENDER_DELAY_MS = 200;
