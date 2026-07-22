import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MapCoordinates } from './map-location-picker.types';
import { LOCATION_TIMEOUT_MS, MAXIMUM_LOCATION_AGE_MS } from './map-location-picker.constants';

@Injectable({
  providedIn: 'root',
})
export class CurrentLocationService {
  getCurrentPosition(): Observable<MapCoordinates> {
    return new Observable<MapCoordinates>((subscriber) => {
      if (!navigator.geolocation) {
        subscriber.error(new Error('المتصفح لا يدعم تحديد الموقع الجغرافي'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          subscriber.next({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          subscriber.complete();
        },
        (error) => {
          subscriber.error(error);
        },
        {
          enableHighAccuracy: false,
          timeout: LOCATION_TIMEOUT_MS,
          maximumAge: MAXIMUM_LOCATION_AGE_MS,
        }
      );
    });
  }
}
