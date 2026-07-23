import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { SearchResult } from './map-location-picker.types';

@Injectable({
  providedIn: 'root',
})
export class LocationSearchService {
  private readonly geocodingService = inject(GeocodingService);

  searchPlaces(query: string): Observable<SearchResult[]> {
    const trimmed = query ? query.trim() : '';
    if (!trimmed || trimmed.length < 2) {
      return of([]);
    }

    return this.geocodingService.searchPlaces(trimmed).pipe(
      catchError(() => of([] as SearchResult[]))
    );
  }
}
