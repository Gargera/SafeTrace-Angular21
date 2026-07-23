import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, finalize } from 'rxjs/operators';
import { NominatimReverseResponse } from './geocoding.types';
import { generateCoordinateCacheKey, formatFallbackAddress } from './geocoding.utils';

@Injectable({ providedIn: 'root' })
export class ReverseGeocodeService {
  private readonly httpClient = inject(HttpClient);
  private readonly requestHeaders = new HttpHeaders({
    'Accept-Language': 'ar,en',
  });

  private readonly reverseGeocodeCache = new Map<string, string>();
  private readonly pendingReverseGeocodeRequests = new Map<string, Observable<string>>();

  reverseGeocode(latitude: number, longitude: number): Observable<string> {
    const cacheKey = generateCoordinateCacheKey(latitude, longitude);
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
      catchError(() => of(formatFallbackAddress(latitude, longitude)))
    );
  }

  private processReverseGeocodeResponse(
    response: NominatimReverseResponse,
    latitude: number,
    longitude: number,
    cacheKey: string
  ): string {
    if (response.error) {
      return formatFallbackAddress(latitude, longitude);
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
}
