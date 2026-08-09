import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { EMPTY, Subscription, interval } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';

import { ProfileService } from '../../features/user-profile/service/profile.service';
import { UpdateCurrentLocationDTO } from '../../features/user-profile/model/profile.model';
import { CurrentLocationService } from '../../shared/components/map-location-picker/services/current-location.service';

const TRACKING_INTERVAL_MS = 10 * 60 * 1000; // 10 Minutes
const LOCATION_CHANGE_THRESHOLD = 0.0001;

@Injectable({
  providedIn: 'root',
})
export class LocationTrackingService implements OnDestroy {
  private readonly profileService = inject(ProfileService);
  private readonly currentLocationService = inject(CurrentLocationService);

  readonly latestLocation = signal<UpdateCurrentLocationDTO | null>(null);
  readonly isTracking = signal(false);

  private timerSubscription?: Subscription;
  private locationSubscription?: Subscription;

  private lastSentLocation: UpdateCurrentLocationDTO | null = null;

  async startTrackingLocation(): Promise<void> {
    if (this.isTracking()) {
      return;
    }

    this.isTracking.set(true);

    const permission = await this.currentLocationService.checkPermissionStatus();

    if (permission === 'denied' || permission === 'unsupported') {
      console.warn(`Location tracking skipped (${permission})`);
      this.isTracking.set(false);
      return;
    }

    this.fetchAndUpdateLocation();

    this.timerSubscription = interval(TRACKING_INTERVAL_MS)
      .subscribe(() => this.fetchAndUpdateLocation());
  }

  stopTrackingLocation(): void {
    this.locationSubscription?.unsubscribe();
    this.timerSubscription?.unsubscribe();

    this.locationSubscription = undefined;
    this.timerSubscription = undefined;

    this.isTracking.set(false);
    this.lastSentLocation = null;
  }

  private fetchAndUpdateLocation(): void {
    this.locationSubscription?.unsubscribe();

    this.locationSubscription = this.currentLocationService
      .getCurrentLocation()
      .pipe(
        catchError((error) => {
          console.error('Location tracking failed', error);
          return EMPTY;
        }),
        switchMap((coords) => {
          const location: UpdateCurrentLocationDTO = {
            currentLocationLatitude: coords.lat,
            currentLocationLongitude: coords.lng,
          };

          this.latestLocation.set(location);

          if (!this.hasLocationChanged(location)) {
            return EMPTY;
          }

          return this.profileService.updateCurrentLocation(location).pipe(
            catchError((error) => {
              console.error('Backend update failed', error);
              return EMPTY;
            })
          );
        }),
        finalize(() => {
          this.locationSubscription = undefined;
        })
      )
      .subscribe((response) => {
        if (response && this.latestLocation()) {
          this.lastSentLocation = this.latestLocation();
        }
      });
  }

  private hasLocationChanged(location: UpdateCurrentLocationDTO): boolean {
    if (!this.lastSentLocation) {
      return true;
    }

    return (
      Math.abs(
        location.currentLocationLatitude -
        this.lastSentLocation.currentLocationLatitude
      ) > LOCATION_CHANGE_THRESHOLD ||
      Math.abs(
        location.currentLocationLongitude -
        this.lastSentLocation.currentLocationLongitude
      ) > LOCATION_CHANGE_THRESHOLD
    );
  }

  ngOnDestroy(): void {
    this.stopTrackingLocation();
  }
}