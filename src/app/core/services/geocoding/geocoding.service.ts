import { Injectable, inject, isDevMode } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, finalize, timeout } from 'rxjs/operators';

const COORDINATE_PRECISION_DECIMALS = 4;
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface NominatimReverseResponse {
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

export interface PlaceSearchResult {
  lat: number;
  lng: number;
  displayName: string;
}

interface NominatimSearchItem {
  lat: string;
  lon: string;
  display_name: string;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export function generateCoordinateCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(COORDINATE_PRECISION_DECIMALS)},${longitude.toFixed(COORDINATE_PRECISION_DECIMALS)}`;
}

export function formatFallbackAddress(latitude: number, longitude: number): string {
  return `${latitude.toFixed(COORDINATE_PRECISION_DECIMALS)}, ${longitude.toFixed(COORDINATE_PRECISION_DECIMALS)}`;
}

const NOMINATIM_HEADERS = new HttpHeaders({
  'Accept-Language': 'ar,en',
});

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly httpClient = inject(HttpClient);

  private searchCleanupCounter = 0;
  private reverseCleanupCounter = 0;

  private readonly reverseGeocodeCache = new Map<string, CacheEntry<string>>();
  private readonly pendingReverseGeocodeRequests = new Map<string, Observable<string>>();

  private readonly searchCache = new Map<string, CacheEntry<PlaceSearchResult[]>>();
  private readonly pendingSearchRequests = new Map<string, Observable<PlaceSearchResult[]>>();

  // ── Reverse Geocoding ──────────────────────────────────────────────────────

  reverseGeocode(latitude: number, longitude: number): Observable<string> {

    this.maybeClearExpiredCache(this.reverseGeocodeCache, 'reverse');

    const cacheKey = generateCoordinateCacheKey(latitude, longitude);

    const cached = this.reverseGeocodeCache.get(cacheKey);

    const now = Date.now();

    if (cached) {
      if (now < cached.expiresAt) {
        return of(cached.value);
      }

      this.reverseGeocodeCache.delete(cacheKey);
    }

    const pending = this.pendingReverseGeocodeRequests.get(cacheKey);

    if (pending) {
      return pending;
    }

    const request$ = this.fetchReverseGeocode(latitude, longitude, cacheKey).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => this.pendingReverseGeocodeRequests.delete(cacheKey))
    );

    this.pendingReverseGeocodeRequests.set(cacheKey, request$);

    return request$;
  }

  private fetchReverseGeocode(
    latitude: number,
    longitude: number,
    cacheKey: string
  ): Observable<string> {

    const params = new HttpParams()
      .set('format', 'jsonv2')
      .set('lat', latitude.toString())
      .set('lon', longitude.toString())
      .set('accept-language', 'ar,en');

    return this.httpClient
      .get<NominatimReverseResponse>(
        'https://nominatim.openstreetmap.org/reverse',
        {
          headers: NOMINATIM_HEADERS,
          params,
        }
      )
      .pipe(
        timeout(5000),
        map(response =>
          this.buildAddress(response, latitude, longitude, cacheKey)
        ),
        catchError(error => {
          this.logError('reverseGeocode', error);
          return of(formatFallbackAddress(latitude, longitude));
        })
      );
  }

  private buildAddress(
    response: NominatimReverseResponse,
    latitude: number,
    longitude: number,
    cacheKey: string
  ): string {
    if (response.error) {
      return formatFallbackAddress(latitude, longitude);
    }

    const parts = response.address ?? {};

    const segments = [
      parts.suburb,
      parts.city ?? parts.town ?? parts.village,
      parts.state,
      parts.country,
    ].filter(Boolean);

    const address =
      segments.length > 0
        ? segments.join('، ')
        : response.display_name || formatFallbackAddress(latitude, longitude);

    const expiresAt = Date.now() + CACHE_TTL_MS;

    this.reverseGeocodeCache.set(cacheKey, {
      value: address,
      expiresAt,
    });

    return address;
  }

  // ── Place Search ───────────────────────────────────────────────────────────

  searchPlaces(query: string): Observable<PlaceSearchResult[]> {

    this.maybeClearExpiredCache(this.searchCache, 'search');

    const trimmed = (query ?? '').trim();

    if (trimmed.length < 2) {
      return of([]);
    }

    const cacheKey = trimmed.toLowerCase();

    const cached = this.searchCache.get(cacheKey);
    const now = Date.now();

    if (cached) {
      if (now < cached.expiresAt) {
        return of(cached.value);
      }

      this.searchCache.delete(cacheKey);
    }

    const pending = this.pendingSearchRequests.get(cacheKey);

    if (pending) {
      return pending;
    }

    const request$ = this.fetchSearchPlaces(trimmed, cacheKey).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => this.pendingSearchRequests.delete(cacheKey))
    );

    this.pendingSearchRequests.set(cacheKey, request$);

    return request$;
  }

  private fetchSearchPlaces(
    query: string,
    cacheKey: string
  ): Observable<PlaceSearchResult[]> {

    const params = new HttpParams()
      .set('format', 'json')
      .set('q', query)
      .set('limit', '6')
      .set('countrycodes', 'eg')
      .set('accept-language', 'ar,en')
      .set('addressdetails', '1');

    return this.httpClient
      .get<NominatimSearchItem[]>(
        'https://nominatim.openstreetmap.org/search',
        {
          headers: NOMINATIM_HEADERS,
          params,
        }
      )
      .pipe(
        timeout(5000),
        map(items => this.parseSearchResults(items, cacheKey)),
        catchError(error => {
          this.logError('searchPlaces', error);
          return of([]);
        })
      );
  }

  private maybeClearExpiredCache<T>(
    cache: Map<string, CacheEntry<T>>,
    type: 'search' | 'reverse'
  ): void {

    if (type === 'search') {
      if (++this.searchCleanupCounter % 20 !== 0) {
        return;
      }
    } else {
      if (++this.reverseCleanupCounter % 20 !== 0) {
        return;
      }
    }

    const now = Date.now();

    for (const [key, value] of cache) {
      if (value.expiresAt <= now) {
        cache.delete(key);
      }
    }
  }

  private logError(operation: string, error: unknown): void {
    if (isDevMode()) {
      console.error(`[GeocodingService] ${operation} failed`, error);
    }
  }

  private parseSearchResults(items: NominatimSearchItem[], cacheKey: string): PlaceSearchResult[] {
    if (!Array.isArray(items)) {
      return [];
    }

    const results = items
      .map((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          return null;
        }

        return {
          lat,
          lng,
          displayName: item.display_name?.trim() ?? '',
        };
      })
      .filter((item): item is PlaceSearchResult => item !== null);

    const expiresAt = Date.now() + CACHE_TTL_MS;

    this.searchCache.set(cacheKey, {
      value: results,
      expiresAt,
    });

    return results;
  }
}
