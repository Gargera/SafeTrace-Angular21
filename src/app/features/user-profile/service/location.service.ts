import { Injectable } from '@angular/core';

// ── Egypt center coordinates (default) ────────────────────────────────────
export const EGYPT_LAT = 26.8206;
export const EGYPT_LNG = 30.8025;
export const EGYPT_ZOOM = 6;

@Injectable({ providedIn: 'root' })
export class LocationService {
  /**
   * Thin Promise wrapper around the callback-based browser Geolocation API.
   * Callers are responsible for checking `isPlatformBrowser` and
   * `navigator.geolocation` support before calling this — it intentionally
   * does not swallow that check, so "unsupported" and "denied/error" stay
   * distinguishable to the caller exactly as before.
   */
  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  /** Builds the initial google.maps.MapOptions for a given center/zoom state. */
  buildMapOptions(lat: number | null, lng: number | null): google.maps.MapOptions {
    return {
      center: { lat: lat || EGYPT_LAT, lng: lng || EGYPT_LNG },
      zoom: lat && lng ? 13 : EGYPT_ZOOM,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    };
  }

  /** Creates a marker at the given position on the given map. */
  createMarker(
    map: google.maps.Map,
    lat: number,
    lng: number,
    draggable: boolean,
  ): google.maps.Marker {
    return new google.maps.Marker({
      position: { lat, lng },
      map,
      draggable,
    });
  }
}
