import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, finalize } from 'rxjs/operators';

declare const google: any;

export interface GeocodeAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

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

const COORDINATE_PRECISION_DECIMALS = 4;

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly httpClient = inject(HttpClient);
  private readonly requestHeaders = new HttpHeaders({
    'Accept-Language': 'ar,en',
  });

  private readonly reverseGeocodeCache = new Map<string, string>();
  private readonly searchCache = new Map<string, PlaceSearchResult[]>();
  private readonly pendingReverseGeocodeRequests = new Map<string, Observable<string>>();
  private readonly pendingSearchRequests = new Map<string, Observable<PlaceSearchResult[]>>();

  reverseGeocode(latitude: number, longitude: number): Observable<string> {
    const cacheKey = this.generateCoordinateCacheKey(latitude, longitude);
    const cachedAddress = this.reverseGeocodeCache.get(cacheKey);

    if (cachedAddress) {
      return of(cachedAddress);
    }

    const pendingRequest = this.pendingReverseGeocodeRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    const request$ = this.fetchReverseGeocodeFromApi(latitude, longitude, cacheKey).pipe(
      shareReplay(1),
      finalize(() => this.pendingReverseGeocodeRequests.delete(cacheKey))
    );

    this.pendingReverseGeocodeRequests.set(cacheKey, request$);
    return request$;
  }

  private fetchReverseGeocodeFromApi(
    latitude: number,
    longitude: number,
    cacheKey: string
  ): Observable<string> {
    const requestUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;

    return this.httpClient.get<NominatimReverseResponse>(requestUrl, { headers: this.requestHeaders }).pipe(
      map((response) => this.processReverseGeocodeResponse(response, latitude, longitude, cacheKey)),
      catchError(() => of(this.formatFallbackAddress(latitude, longitude)))
    );
  }

  private processReverseGeocodeResponse(
    response: NominatimReverseResponse,
    latitude: number,
    longitude: number,
    cacheKey: string
  ): string {
    if (response.error) {
      return this.formatFallbackAddress(latitude, longitude);
    }

    const addressParts = response.address;
    const locationSegments = [
      addressParts.suburb,
      addressParts.city ?? addressParts.town ?? addressParts.village,
      addressParts.state,
      addressParts.country,
    ].filter(Boolean);

    const formattedAddress = locationSegments.length > 0 ? locationSegments.join('، ') : response.display_name;
    this.reverseGeocodeCache.set(cacheKey, formattedAddress);
    return formattedAddress;
  }

  searchPlaces(query: string): Observable<PlaceSearchResult[]> {
    const trimmedQuery = query ? query.trim() : '';
    if (!trimmedQuery || trimmedQuery.length < 2) {
      return of([]);
    }

    const cacheKey = trimmedQuery.toLowerCase();
    const cachedResults = this.searchCache.get(cacheKey);
    if (cachedResults) {
      return of(cachedResults);
    }

    const pendingRequest = this.pendingSearchRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    const request$ = this.fetchSearchPlacesFromApi(trimmedQuery, cacheKey).pipe(
      shareReplay(1),
      finalize(() => this.pendingSearchRequests.delete(cacheKey))
    );

    this.pendingSearchRequests.set(cacheKey, request$);
    return request$;
  }

  private fetchSearchPlacesFromApi(searchQuery: string, cacheKey: string): Observable<PlaceSearchResult[]> {
    const requestUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=6`;

    return this.httpClient.get<any[]>(requestUrl, { headers: this.requestHeaders }).pipe(
      map((apiResults) => this.processSearchResponse(apiResults, cacheKey)),
      catchError(() => of([]))
    );
  }

  private processSearchResponse(rawResults: any[], cacheKey: string): PlaceSearchResult[] {
    if (!Array.isArray(rawResults)) {
      return [];
    }

    const parsedResults: PlaceSearchResult[] = rawResults.map((item) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
    }));

    this.searchCache.set(cacheKey, parsedResults);
    return parsedResults;
  }

  forwardGeocode(address: string): Observable<{ lat: number; lng: number } | null> {
    return new Observable((observer) => {
      if (typeof google === 'undefined' || !google.maps) {
        observer.next(null);
        observer.complete();
        return;
      }

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address, region: 'EG' }, (results: any, status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          const location = results[0].geometry.location;
          observer.next({ lat: location.lat(), lng: location.lng() });
        } else {
          observer.next(null);
        }
        observer.complete();
      });
    });
  }

  attachAutocomplete(
    inputElement: HTMLInputElement,
    onPlaceSelected: (result: { lat: number; lng: number; address: string }) => void
  ): void {
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) return;

    const autocomplete = new google.maps.places.Autocomplete(inputElement, {
      componentRestrictions: { country: 'eg' },
      fields: ['geometry', 'formatted_address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;

      onPlaceSelected({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address ?? '',
      });
    });
  }

  private generateCoordinateCacheKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(COORDINATE_PRECISION_DECIMALS)},${longitude.toFixed(COORDINATE_PRECISION_DECIMALS)}`;
  }

  private formatFallbackAddress(latitude: number, longitude: number): string {
    return `${latitude.toFixed(COORDINATE_PRECISION_DECIMALS)}, ${longitude.toFixed(COORDINATE_PRECISION_DECIMALS)}`;
  }
}