// import { Injectable, inject } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Observable, of } from 'rxjs';
// import { map, catchError } from 'rxjs/operators';
// import { environment } from '../../../environments/environment.development';

// // ── Nominatim response shape (only the fields we use) ─────────────────────
// interface NominatimReverseResponse {
//   display_name: string;
//   address: {
//     road?: string;
//     suburb?: string;
//     city?: string;
//     town?: string;
//     village?: string;
//     state?: string;
//     country?: string;
//   };
//   error?: string;
// }

// // ── Cache entry ────────────────────────────────────────────────────────────
// interface CacheEntry {
//   address: string;
// }

// // ── Coordinate precision for cache key (4 decimal places ≈ 11 m accuracy) ─
// const PRECISION = 4;

// @Injectable({ providedIn: 'root' })
// export class GeocodingService {
//   readonly #http = inject(HttpClient);

//   /**
//    * Nominatim requires a descriptive User-Agent per usage policy:
//    * https://operations.osmfoundation.org/policies/nominatim/
//    */

//   headers = new HttpHeaders({
//     'Accept-Language': 'ar',
//   });

//   /** In-memory cache: "lat,lng" → resolved address */
//   readonly #cache = new Map<string, CacheEntry>();

//   // ── Public API ────────────────────────────────────────────────────────────

//   /**
//    * Reverse geocode lat/lng → human-readable Arabic address via Nominatim.
//    *
//    * - Returns cached result immediately if the same coordinates were resolved before.
//    * - Falls back to raw coordinate string on any error — never throws.
//    * - Caller is responsible for cancellation via switchMap (see edit-profile component).
//    */
//   reverseGeocode(lat: number, lng: number): Observable<string> {
//     const params = {
//       latlng: `${lat},${lng}`,
//       language: 'ar',
//       key: environment.googleMapsApiKey,
//     };

//     return this.#http
//       .get<any>('https://maps.googleapis.com/maps/api/geocode/json', { params })
//       .pipe(
//         map((res) => {
//           if (res.status !== 'OK' || !res.results.length) return this.#fallback(lat, lng);

//           return res.results[0].formatted_address;
//         }),
//         catchError(() => of(this.#fallback(lat, lng))),
//       );
//   }

//   // ── Private helpers ───────────────────────────────────────────────────────

//   #cacheKey(lat: number, lng: number): string {
//     return `${lat.toFixed(PRECISION)},${lng.toFixed(PRECISION)}`;
//   }

//   #fallback(lat: number, lng: number): string {
//     return `${lat.toFixed(PRECISION)}, ${lng.toFixed(PRECISION)}`;
//   }
// }
// import { Injectable, inject } from '@angular/core';
// import { HttpClient, HttpParams } from '@angular/common/http';
// import { Observable, of } from 'rxjs';
// import { map, catchError } from 'rxjs/operators';
// import { environment } from '../../../environments/environment.development';

// // ── Google Geocoding API response (only required fields) ───────────────────
// interface GoogleGeocodingResponse {
//   status: string;
//   results: {
//     formatted_address: string;
//   }[];
// }

// interface CacheEntry {
//   address: string;
// }

// // Coordinate precision for cache key (4 decimal places ≈ 11m)
// const PRECISION = 4;

// @Injectable({
//   providedIn: 'root',
// })
// export class GeocodingService {
//   readonly #http = inject(HttpClient);

//   /** In-memory cache */
//   readonly #cache = new Map<string, CacheEntry>();

//   /**
//    * Reverse geocode latitude/longitude into a human-readable Arabic address.
//    */
//   reverseGeocode(lat: number, lng: number): Observable<string> {
//     const key = this.#cacheKey(lat, lng);
//     console.log('Latitude:', lat);
//     console.log('Longitude:', lng);
//     console.log(`${lat},${lng}`);
//     // Cache hit
//     const cached = this.#cache.get(key);
//     if (cached) {
//       return of(cached.address);
//     }

//     const params = new HttpParams()
//       .set('latlng', `${lat},${lng}`)
//       .set('language', 'ar')
//       .set('key', environment.googleMapsApiKey);

//     return this.#http
//       .get<GoogleGeocodingResponse>('https://maps.googleapis.com/maps/api/geocode/json', { params })
//       .pipe(
//         map((response) => {
//           console.log('Google Response:', response);

//           if (response.status !== 'OK') {
//             throw new Error(`Google Geocoding Error: ${response.status}`);
//           }

//           const address = response.results[0].formatted_address;

//           this.#cache.set(key, { address });

//           return address;
//         }),
//         catchError((err) => {
//           console.error(err);
//           console.error('Reverse geocoding failed:', err);
//           return of(this.#fallback(lat, lng));
//         }),
//       );
//   }

//   // ──────────────────────────────────────────────────────────────────────────

//   #cacheKey(lat: number, lng: number): string {
//     return `${lat.toFixed(PRECISION)},${lng.toFixed(PRECISION)}`;
//   }

//   #fallback(lat: number, lng: number): string {
//     return `${lat.toFixed(PRECISION)}, ${lng.toFixed(PRECISION)}`;
//   }
// }

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GeocodingService {
  reverseGeocode(lat: number, lng: number): Observable<string> {
    return new Observable((observer) => {
      const geocoder = new google.maps.Geocoder();

      geocoder.geocode(
        {
          location: {
            lat,
            lng,
          },
        },
        (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
            observer.next(results[0].formatted_address);
          } else {
            observer.next(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }

          observer.complete();
        },
      );
    });
  }
}