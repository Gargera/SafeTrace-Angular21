import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { fallbackAddress } from './map-location-picker.utils';

@Injectable({
  providedIn: 'root',
})
export class ReverseGeocodeService {
  private readonly geocodingService = inject(GeocodingService);

  resolve(lat: number, lng: number): Observable<string> {
    return this.geocodingService.reverseGeocode(lat, lng).pipe(
      catchError(() => of(fallbackAddress(lat, lng)))
    );
  }
}
