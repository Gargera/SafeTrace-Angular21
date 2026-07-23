import {
  Component,
  DestroyRef,
  inject,
  input,
  OnChanges,
  output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GeocodingService } from '../../../../../../core/services/geocoding.service';
import { SnackbarService } from '../../../../../../core/services/toast.service';
import { GetUserInfoDTO, UpdateHomeLocationDTO } from '../../../../model/profile.model';
import { ProfileService } from '../../../../service/profile.service';
import { MapLocationPickerComponent } from '../../../../../../shared/components/map-location-picker/map-location-picker';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, MapLocationPickerComponent],
  templateUrl: './location-picker.html',
})
export class LocationPicker implements OnChanges {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  readonly locationUpdated = output<void>();

  readonly #profileService = inject(ProfileService);
  readonly #geocodingService = inject(GeocodingService);
  readonly #snackbar = inject(SnackbarService);
  readonly #destroyRef = inject(DestroyRef);

  readonly isMapModalOpen = signal(false);
  readonly isSavingLocation = signal(false);
  readonly isLocating = signal(false);

  readonly selectedLat = signal<number | null>(null);
  readonly selectedLng = signal<number | null>(null);
  readonly resolvedAddress = signal<string | null>(null);
  readonly isResolvingAddress = signal(false);

  private readonly reverseGeocodeSubject$ = new Subject<{ lat: number; lng: number }>();

  constructor() {
    this.initGeocodePipeline();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userInfo'] && this.userInfo()) {
      const info = this.userInfo()!;
      if (info.homeLatitude && info.homeLongitude) {
        this.setLocation(info.homeLatitude, info.homeLongitude);
      }
    }
  }

  private initGeocodePipeline(): void {
    this.reverseGeocodeSubject$
      .pipe(
        tap(() => this.isResolvingAddress.set(true)),
        switchMap(({ lat, lng }) =>
          this.#geocodingService
            .reverseGeocode(lat, lng)
            .pipe(catchError(() => of(`${lat.toFixed(4)}, ${lng.toFixed(4)}`))),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((address) => {
        this.resolvedAddress.set(address);
        this.isResolvingAddress.set(false);
      });
  }

  openMapModal(): void {
    this.isMapModalOpen.set(true);
  }

  closeMapModal(): void {
    this.isMapModalOpen.set(false);
  }

  onLocationConfirmed(event: { lat: number; lng: number; address: string }): void {
    this.selectedLat.set(event.lat);
    this.selectedLng.set(event.lng);
    this.resolvedAddress.set(event.address);
    this.isMapModalOpen.set(false);
    this.saveLocation();
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.#snackbar.error('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }

    this.isLocating.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.setLocation(lat, lng);
        this.isLocating.set(false);
        this.saveLocation();
      },
      () => {
        this.isLocating.set(false);
        this.#snackbar.error('تعذر تحديد موقعك الحالي');
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  }

  saveLocation(): void {
    const lat = this.selectedLat();
    const lng = this.selectedLng();
    if (lat === null || lng === null || this.isSavingLocation()) {
      return;
    }

    this.isSavingLocation.set(true);
    const dto: UpdateHomeLocationDTO = { homeLatitude: lat, homeLongitude: lng };

    this.#profileService
      .updateHomeLocation(dto)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.isSavingLocation.set(false);
          this.#snackbar.success('تم حفظ الموقع بنجاح');
          this.locationUpdated.emit();
        },
        error: (err) => {
          this.isSavingLocation.set(false);
          const msg = err?.error?.message ?? 'حدث خطأ أثناء حفظ الموقع. يرجى المحاولة مجدداً.';
          this.#snackbar.error(msg);
        },
      });
  }

  private setLocation(lat: number, lng: number): void {
    this.selectedLat.set(lat);
    this.selectedLng.set(lng);
    this.reverseGeocodeSubject$.next({ lat, lng });
  }
}
