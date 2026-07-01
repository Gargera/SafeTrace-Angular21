import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';

interface GeocodeResult {
  formatted_address: string;
  address_components: {
    long_name: string;
    short_name: string;
    types: string[];
  }[];
}

interface GeocodeResponse {
  status: string;
  results: GeocodeResult[];
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  readonly #http = inject(HttpClient);

  /**
   * Reverse geocode: converts lat/lng coordinates to a human-readable address.
   * Returns Arabic address string, falls back to coordinate string on error.
   */
  reverseGeocode(lat: number, lng: number): Observable<string> {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${lat},${lng}` +
      `&language=ar` + // Arabic results
      `&result_type=locality|administrative_area_level_1|country` +
      `&key=${environment.googleMapsApiKey}`;

    return this.#http.get<GeocodeResponse>(url).pipe(
      map((response) => {
        if (response.status === 'OK' && response.results.length > 0) {
          // Use the first result's formatted address (already in Arabic)
          return response.results[0].formatted_address;
        }
        // Fallback: raw coordinates
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }),
      catchError(() => {
        // Never let geocoding break the UI
        return of(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }),
    );
  }

  /**
   * Forward geocode: converts an address string to lat/lng.
   * Useful for future search-by-address feature.
   */
  forwardGeocode(address: string): Observable<{ lat: number; lng: number } | null> {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(address)}` +
      `&language=ar` +
      `&key=${environment.googleMapsApiKey}`;

    return this.#http.get<GeocodeResponse>(url).pipe(
      map((response) => {
        if (response.status === 'OK' && response.results.length > 0) {
          const loc = response.results[0];
          // Extract from geometry — typed access
          const geometry = (
            loc as GeocodeResult & {
              geometry: { location: { lat: number; lng: number } };
            }
          ).geometry;
          return { lat: geometry.location.lat, lng: geometry.location.lng };
        }
        return null;
      }),
      catchError(() => of(null)),
    );
  }
}
