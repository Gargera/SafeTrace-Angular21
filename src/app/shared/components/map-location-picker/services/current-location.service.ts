import { Injectable } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { switchMap, takeUntil, timeout, catchError } from 'rxjs/operators';
import { MapCoordinates } from '../models/location.models';
import { LOCATION_TIMEOUT_MS, MAXIMUM_LOCATION_AGE_MS } from '../constants/location.constants';

export type GeolocationPermissionStatus = 'granted' | 'prompt' | 'denied' | 'unsupported';

@Injectable({
  providedIn: 'root',
})
export class CurrentLocationService {
  private readonly cancelPreviousRequestSubject$ = new Subject<void>();

  async checkPermissionStatus(): Promise<GeolocationPermissionStatus> {
    if (!navigator.geolocation) {
      return 'unsupported';
    }
    if (!navigator.permissions || !navigator.permissions.query) {
      return 'prompt';
    }
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
      return permissionStatus.state as GeolocationPermissionStatus;
    } catch {
      return 'prompt';
    }
  }

  getCurrentLocation(): Observable<MapCoordinates> {
    this.cancelPreviousRequestSubject$.next();

    return new Observable<void>((subscriber) => {
      subscriber.next();
      subscriber.complete();
    }).pipe(
      takeUntil(this.cancelPreviousRequestSubject$),
      switchMap(() => this.executeLocationAcquisition())
    );
  }

  private executeLocationAcquisition(): Observable<MapCoordinates> {
    return new Observable<MapCoordinates>((subscriber) => {
      let watchId: number | null = null;

      const cleanupWatch = (): void => {
        if (watchId !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      };

      this.checkPermissionStatus().then((permission) => {
        if (permission === 'unsupported') {
          subscriber.error(new Error('متصفحك لا يدعم تحديد الموقع الجغرافي.'));
          return;
        }
        if (permission === 'denied') {
          subscriber.error(new Error('تم رفض إذن الوصول للموقع الجغرافي.'));
          return;
        }

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            cleanupWatch();
            subscriber.next({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            subscriber.complete();
          },
          (error) => {
            cleanupWatch();
            subscriber.error(error);
          },
          {
            enableHighAccuracy: true,
            timeout: LOCATION_TIMEOUT_MS,
            maximumAge: MAXIMUM_LOCATION_AGE_MS,
          }
        );
      });

      return () => cleanupWatch();
    }).pipe(
      timeout({
        first: LOCATION_TIMEOUT_MS,
        with: () => throwError(() => new Error('انتهت مهلة تحديد الموقع.')),
      }),
      catchError(() => this.executeLowAccuracyFallback())
    );
  }

  private executeLowAccuracyFallback(): Observable<MapCoordinates> {
    return new Observable<MapCoordinates>((subscriber) => {
      let watchId: number | null = null;

      const cleanupWatch = (): void => {
        if (watchId !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      };

      if (!navigator.geolocation) {
        subscriber.error(new Error('المتصفح لا يدعم تحديد الموقع الجغرافي.'));
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          cleanupWatch();
          subscriber.next({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          subscriber.complete();
        },
        (error) => {
          cleanupWatch();
          subscriber.error(error);
        },
        {
          enableHighAccuracy: false,
          timeout: LOCATION_TIMEOUT_MS,
          maximumAge: MAXIMUM_LOCATION_AGE_MS,
        }
      );

      return () => cleanupWatch();
    }).pipe(
      timeout({
        first: LOCATION_TIMEOUT_MS,
        with: () => throwError(() => new Error('تعذر تحديد موقعك الحالي.')),
      })
    );
  }
}
