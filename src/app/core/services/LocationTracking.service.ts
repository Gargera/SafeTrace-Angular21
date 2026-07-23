import { HttpClient } from '@angular/common/http';
import { UpdateCurrentLocationDTO } from '../../features/user-profile/model/profile.model';
import { ProfileService } from '../../features/user-profile/service/profile.service';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocationTrackingService {
  //Current Location By Watch Position
  private watchId: number | null = null;
  readonly #http = inject(HttpClient);
  readonly #profileService = inject(ProfileService);
  private latestLocation: UpdateCurrentLocationDTO | null = null;

  startTrackingLocation() {
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.latestLocation = {
          currentLocationLatitude: position.coords.latitude,
          currentLocationLongitude: position.coords.longitude,
        };
      },
      (error) => console.error(error),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
      },
    );

    // كل 10 دقائق
    setInterval(
      () => {
        if (!this.latestLocation) return;
        this.#profileService.updateCurrentLocation(this.latestLocation).subscribe();
      },
      10 * 60 * 1000,
    );
  }

  stopTrackingLocation() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}
