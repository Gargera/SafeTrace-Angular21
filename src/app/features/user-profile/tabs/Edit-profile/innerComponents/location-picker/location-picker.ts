import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  input,
  OnChanges,
  OnDestroy,
  output,
  PLATFORM_ID,
  signal,
  SimpleChanges,
  ViewChild,
  effect,
} from '@angular/core';
import { Subject, switchMap } from 'rxjs';
import { GeocodingService } from '../../../../../../core/services/geocoding.service';
import { SnackbarService } from '../../../../../../core/services/toast.service';
import { GetUserInfoDTO, UpdateHomeLocationDTO } from '../../../../model/profile.model';
import { ProfileService } from '../../../../service/profile.service';
import {
  LocationService,
  EGYPT_LAT,
  EGYPT_LNG,
  EGYPT_ZOOM,
} from '../../../../service/location.service';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [],
  templateUrl: './location-picker.html',
})
export class LocationPicker implements OnChanges, AfterViewInit, OnDestroy {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  // Emitted after a successful save — parent re-fetches GetUserInfo and
  // pushes the fresh profile up to ProfileView (UpdateHomeLocation only
  // returns a bool, not the updated user).
  readonly locationUpdated = output<void>();

  readonly #profileService = inject(ProfileService);
  readonly #geocodingService = inject(GeocodingService);
  readonly #locationService = inject(LocationService);
  readonly #snackbar = inject(SnackbarService);
  readonly #platformId = inject(PLATFORM_ID);

  @ViewChild('mapContainer', { static: false }) mapElement!: ElementRef<HTMLDivElement>;

  // ── Section Editing/Loading flags ─────────────────────────────────────────
  readonly isEditingLocation = signal(false);
  readonly isSavingLocation = signal(false);

  // ── Map state ─────────────────────────────────────────────────────────────
  readonly selectedLat = signal<number | null>(null);
  readonly selectedLng = signal<number | null>(null);
  readonly resolvedAddress = signal<string | null>(null);
  readonly isResolvingAddress = signal(false);

  // ── Map and Marker instances ──────────────────────────────────────────────
  map: google.maps.Map | null = null;
  marker: google.maps.Marker | null = null;

  constructor() {
    // Dynamic effect to control marker dragability state based on edit location flag
    effect(() => {
      const editing = this.isEditingLocation();
      if (this.marker) {
        this.marker.setDraggable(editing);
      }
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userInfo'] && this.userInfo()) {
      const info = this.userInfo()!;

      // Set map to user's saved location if available
      if (info.homeLatitude && info.homeLongitude) {
        this.selectedLat.set(info.homeLatitude);
        this.selectedLng.set(info.homeLongitude);
        if (this.map && isPlatformBrowser(this.#platformId)) {
          this.#updateMapAndMarker(info.homeLatitude, info.homeLongitude, 13);
        } else {
          this.#reverseGeocode(info.homeLatitude, info.homeLongitude);
        }
      }
    }
  }

  ngAfterViewInit(): void {
    this.#initGeocodePipeline();
    if (isPlatformBrowser(this.#platformId)) {
      this.#initMap();
    }
  }

  // ── Map logic ─────────────────────────────────────────────────────────────

  #initMap(): void {
    const lat = this.selectedLat();
    const lng = this.selectedLng();

    const mapOptions = this.#locationService.buildMapOptions(lat, lng);

    if (this.mapElement?.nativeElement) {
      this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

      if (lat && lng) {
        this.marker = this.#locationService.createMarker(
          this.map,
          lat,
          lng,
          this.isEditingLocation(),
        );

        this.marker.addListener('dragend', () => {
          if (!this.isEditingLocation()) return;
          const pos = this.marker?.getPosition();
          if (pos) {
            const newLat = pos.lat();
            const newLng = pos.lng();
            this.selectedLat.set(newLat);
            this.selectedLng.set(newLng);
            this.#reverseGeocode(newLat, newLng);
          }
        });
      } else {
        // If user profile has no location, request current browser geolocation
        this.useCurrentLocation();
      }

      this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (!this.isEditingLocation()) return;
        const latLng = event.latLng;
        if (latLng) {
          const clickLat = latLng.lat();
          const clickLng = latLng.lng();
          this.selectedLat.set(clickLat);
          this.selectedLng.set(clickLng);
          this.#updateMapAndMarker(clickLat, clickLng);
        }
      });
    }
  }

  #updateMapAndMarker(lat: number, lng: number, zoom?: number): void {
    if (!this.map) return;
    this.map.setCenter({ lat, lng });
    if (zoom !== undefined) {
      this.map.setZoom(zoom);
    }

    if (!this.marker) {
      this.marker = this.#locationService.createMarker(
        this.map,
        lat,
        lng,
        this.isEditingLocation(),
      );

      this.marker.addListener('dragend', () => {
        if (!this.isEditingLocation()) return;
        const pos = this.marker?.getPosition();
        if (pos) {
          const newLat = pos.lat();
          const newLng = pos.lng();
          this.selectedLat.set(newLat);
          this.selectedLng.set(newLng);
          this.#reverseGeocode(newLat, newLng);
        }
      });
    } else {
      this.marker.setMap(this.map);
      this.marker.setPosition({ lat, lng });
    }

    this.#reverseGeocode(lat, lng);
  }

  useCurrentLocation(): void {
    if (isPlatformBrowser(this.#platformId) && navigator.geolocation) {
      this.isResolvingAddress.set(true);
      this.#locationService.getCurrentPosition().then(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.selectedLat.set(lat);
          this.selectedLng.set(lng);
          this.#updateMapAndMarker(lat, lng, 15);
        },
        (error) => {
          console.warn('Geolocation failed:', error);
          this.isResolvingAddress.set(false);
          // Fallback to Egypt if no location is selected yet
          if (this.selectedLat() === null) {
            this.selectedLat.set(EGYPT_LAT);
            this.selectedLng.set(EGYPT_LNG);
            this.#updateMapAndMarker(EGYPT_LAT, EGYPT_LNG, EGYPT_ZOOM);
          }
        },
      );
    }
  }

  resetMap(): void {
    const info = this.userInfo();
    if (info && info.homeLatitude && info.homeLongitude) {
      this.selectedLat.set(info.homeLatitude);
      this.selectedLng.set(info.homeLongitude);
      this.#updateMapAndMarker(info.homeLatitude, info.homeLongitude, 13);
    } else {
      this.selectedLat.set(null);
      this.selectedLng.set(null);
      this.resolvedAddress.set(null);
      if (this.marker) {
        this.marker.setMap(null);
        this.marker = null;
      }
      if (this.map) {
        this.map.setCenter({ lat: EGYPT_LAT, lng: EGYPT_LNG });
        this.map.setZoom(EGYPT_ZOOM);
      }
    }
  }

  // Subject that cancels the previous geocoding request via switchMap
  // when the user picks a new location before the response arrives.
  readonly #geocode$ = new Subject<{ lat: number; lng: number }>();

  #initGeocodePipeline(): void {
    this.#geocode$
      .pipe(switchMap(({ lat, lng }) => this.#geocodingService.reverseGeocode(lat, lng)))
      .subscribe({
        next: (address) => {
          this.resolvedAddress.set(address);
          this.isResolvingAddress.set(false);
        },
        error: () => {
          this.isResolvingAddress.set(false);
        },
      });
  }

  #reverseGeocode(lat: number, lng: number): void {
    this.isResolvingAddress.set(true);
    this.#geocode$.next({ lat, lng });
  }

  // ── Edit/Cancel toggle ───────────────────────────────────────────────────

  cancelLocation(): void {
    this.isEditingLocation.set(false);
    const info = this.userInfo();
    if (info && info.homeLatitude && info.homeLongitude) {
      this.selectedLat.set(info.homeLatitude);
      this.selectedLng.set(info.homeLongitude);
      this.#updateMapAndMarker(info.homeLatitude, info.homeLongitude, 13);
    } else {
      this.resetMap();
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  saveLocation(): void {
    const lat = this.selectedLat();
    const lng = this.selectedLng();
    if (lat === null || lng === null || this.isSavingLocation()) {
      return;
    }

    this.isSavingLocation.set(true);

    const dto: UpdateHomeLocationDTO = { homeLatitude: lat, homeLongitude: lng };

    this.#profileService.updateHomeLocation(dto).subscribe({
      next: () => {
        this.isSavingLocation.set(false);
        this.isEditingLocation.set(false);
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

  ngOnDestroy(): void {
    this.#geocode$.complete();
    if (this.marker) {
      google.maps.event.clearInstanceListeners(this.marker);
      this.marker.setMap(null);
      this.marker = null;
    }
    if (this.map) {
      google.maps.event.clearInstanceListeners(this.map);
      this.map = null;
    }
  }
}
