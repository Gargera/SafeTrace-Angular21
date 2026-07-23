import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ReverseGeocodeService } from './reverse-geocode.service';
import { PlaceSearchService } from './place-search.service';
import { PlaceSearchResult } from './geocoding.types';

export * from './geocoding.types';
export * from './geocoding.utils';
export * from './reverse-geocode.service';
export * from './place-search.service';

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly reverseGeocodeService = inject(ReverseGeocodeService);
  private readonly placeSearchService = inject(PlaceSearchService);

  reverseGeocode(latitude: number, longitude: number): Observable<string> {
    return this.reverseGeocodeService.reverseGeocode(latitude, longitude);
  }

  searchPlaces(query: string): Observable<PlaceSearchResult[]> {
    return this.placeSearchService.searchPlaces(query);
  }
}
