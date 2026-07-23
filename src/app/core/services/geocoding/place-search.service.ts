import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, finalize } from 'rxjs/operators';
import { PlaceSearchResult } from './geocoding.types';

@Injectable({ providedIn: 'root' })
export class PlaceSearchService {
  private readonly httpClient = inject(HttpClient);
  private readonly requestHeaders = new HttpHeaders({
    'Accept-Language': 'ar,en',
  });

  private readonly searchCache = new Map<string, PlaceSearchResult[]>();
  private readonly pendingSearchRequests = new Map<string, Observable<PlaceSearchResult[]>>();

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
}
