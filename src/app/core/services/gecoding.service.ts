import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

interface ReverseGeocodeResponse {
  display_name: string;
  address?: {
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    village?: string;
    town?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface ForwardGeocodeResult {
  lat: string;
  lon: string;
  display_name: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeocodingService {
  #http = inject(HttpClient);

  /**
   * Reverse Geocoding
   * lat/lng -> Address
   */
  reverseGeocode(lat: number, lng: number): Observable<string> {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}` +
      `&lon=${lng}` +
      `&format=jsonv2` +
      `&accept-language=ar`;

    return this.#http.get<ReverseGeocodeResponse>(url).pipe(
      map((res) => {
        const address = res.address;

        if (!address) {
          return this.#coordsFallback(lat, lng);
        }

        const district =
          address.neighbourhood ??
          address.suburb ??
          address.city_district ??
          address.village ??
          address.town ??
          address.city;

        const governorate = address.state;
        const country = address.country;

        const parts = [district, governorate, country].filter(Boolean);

        const unique = [...new Set(parts)];

        return unique.length
          ? unique.join('، ')
          : (res.display_name ?? this.#coordsFallback(lat, lng));
      }),
      catchError(() => of(this.#coordsFallback(lat, lng))),
    );
  }

  /**
   * Forward Geocoding
   * Address -> lat/lng
   */
  forwardGeocode(address: string): Observable<{ lat: number; lng: number } | null> {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(address)}` +
      `&format=jsonv2` +
      `&limit=1` +
      `&accept-language=ar` +
      `&countrycodes=eg`;

    return this.#http.get<ForwardGeocodeResult[]>(url).pipe(
      map((results) => {
        if (!results.length) return null;

        return {
          lat: Number(results[0].lat),
          lng: Number(results[0].lon),
        };
      }),
      catchError(() => of(null)),
    );
  }

  #coordsFallback(lat: number, lng: number): string {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
