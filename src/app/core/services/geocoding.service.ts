import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// ── Nominatim response shape (only the fields we use) ─────────────────────
interface NominatimReverseResponse {
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
  error?: string;
}

// ── Cache entry ────────────────────────────────────────────────────────────
interface CacheEntry {
  address: string;
}

// ── Coordinate precision for cache key (4 decimal places ≈ 11 m accuracy) ─
const PRECISION = 4;

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  readonly #http = inject(HttpClient);

  /**
   * Nominatim requires a descriptive User-Agent per usage policy:
   * https://operations.osmfoundation.org/policies/nominatim/
   */
  readonly #headers = new HttpHeaders({
    'Accept-Language': 'ar', // Arabic results
    'User-Agent': 'SafeTrace-App/1.0', // Required by Nominatim policy
  });

  /** In-memory cache: "lat,lng" → resolved address */
  readonly #cache = new Map<string, CacheEntry>();

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Reverse geocode lat/lng → human-readable Arabic address via Nominatim.
   *
   * - Returns cached result immediately if the same coordinates were resolved before.
   * - Falls back to raw coordinate string on any error — never throws.
   * - Caller is responsible for cancellation via switchMap (see edit-profile component).
   */
  reverseGeocode(lat: number, lng: number): Observable<string> {
    const key = this.#cacheKey(lat, lng);

    // ── Cache hit ──────────────────────────────────────────────────────────
    const cached = this.#cache.get(key);
    if (cached) {
      return of(cached.address);
    }

    // ── Cache miss → HTTP call ─────────────────────────────────────────────
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=jsonv2` +
      `&lat=${lat}` +
      `&lon=${lng}`;

    return this.#http.get<NominatimReverseResponse>(url, { headers: this.#headers }).pipe(
      map((response) => {
        if (response.error) {
          return this.#fallback(lat, lng);
        }

        // Build a concise address from parts (city + state + country)
        const a = response.address;
        const parts = [a.suburb, a.city ?? a.town ?? a.village, a.state, a.country].filter(Boolean);

        const address =
          parts.length > 0
            ? parts.join('، ') // Arabic comma separator
            : response.display_name; // Full string as fallback

        // Store in cache
        this.#cache.set(key, { address });
        return address;
      }),
      catchError(() => of(this.#fallback(lat, lng))),
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  #cacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(PRECISION)},${lng.toFixed(PRECISION)}`;
  }

  #fallback(lat: number, lng: number): string {
    return `${lat.toFixed(PRECISION)}, ${lng.toFixed(PRECISION)}`;
  }
}
