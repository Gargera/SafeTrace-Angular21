import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';

interface GeocodeAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodeResult {
  formatted_address: string;
  address_components: GeocodeAddressComponent[];
  geometry: { location: { lat: number; lng: number } };
}

interface GeocodeResponse {
  status: string;
  results: GeocodeResult[];
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  readonly #http = inject(HttpClient);

  /**
   * Reverse geocode: converts lat/lng coordinates into a short, human-readable
   * Arabic address of the form "الحي، المحافظة، الدولة"
   * e.g. "مدينة نصر، القاهرة، مصر"
   *
   * Falls back to raw coordinates if Google returns nothing usable or errors out.
   * Requires: Geocoding API enabled on the API key used here.
   */
  reverseGeocode(lat: number, lng: number): Observable<string> {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${lat},${lng}` +
      `&language=ar` +
      // sublocality/neighborhood gives us the district (e.g. "مدينة نصر"),
      // administrative_area_level_1 gives the governorate/city (e.g. "القاهرة")
      `&result_type=sublocality|neighborhood|locality|administrative_area_level_1|country` +
      `&key=${environment.googleMapsApiKey}`;

    return this.#http.get<GeocodeResponse>(url).pipe(
      map((response) => {
        if (response.status === 'OK' && response.results.length > 0) {
          const short = this.#buildShortAddress(response.results[0].address_components);
          return short ?? response.results[0].formatted_address;
        }
        return this.#coordsFallback(lat, lng);
      }),
      catchError(() => of(this.#coordsFallback(lat, lng))),
    );
  }

  /**
   * Builds "District، Governorate، Country" from Google's address_components.
   *   - District    : sublocality_level_1 / sublocality / neighborhood / locality
   *   - Governorate : administrative_area_level_1
   *   - Country     : country
   * Returns null if nothing usable was found (caller falls back to formatted_address).
   */
  #buildShortAddress(components: GeocodeAddressComponent[]): string | null {
    const find = (...types: string[]): string | undefined =>
      components.find((c) => types.some((t) => c.types.includes(t)))?.long_name;

    const district = find('sublocality_level_1', 'sublocality', 'neighborhood', 'locality');
    const governorate = find('administrative_area_level_1');
    const country = find('country');

    const parts = [district, governorate, country].filter((p): p is string => !!p);
    // Avoid "القاهرة، القاهرة، مصر" when district === governorate
    const unique = parts.filter((p, i) => parts.indexOf(p) === i);

    return unique.length ? unique.join('، ') : null;
  }

  #coordsFallback(lat: number, lng: number): string {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  /**
   * Forward geocode: converts an address string to lat/lng.
   * Requires: Geocoding API enabled on the API key used here.
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
          const { location } = response.results[0].geometry;
          return { lat: location.lat, lng: location.lng };
        }
        return null;
      }),
      catchError(() => of(null)),
    );
  }
}
