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
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { forkJoin, Observable, Subject, switchMap } from 'rxjs';
import {
  ChangePasswordDTO,
  GetUserInfoDTO,
  UpdateHomeLocationDTO,
  UpdateNameDTO,
} from '../../../../core/models/profile.model';
import { GeocodingService } from '../../../../core/services/gecoding.service';
import { ApiResponse, ProfileService } from '../../Service/profile.service';

// ── Egypt center coordinates (default) ────────────────────────────────────
const EGYPT_LAT = 26.8206;
const EGYPT_LNG = 30.8025;
const EGYPT_ZOOM = 6;

// ── Custom validator: passwords match ─────────────────────────────────────
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const current = group.get('currentPassword')?.value;
  const next = group.get('newPassword')?.value;
  if (next && current && current === next) {
    return { samePassword: true };
  }
  return null;
}

// ── Custom validator: new password and confirm password match ─────────────
function passwordConfirmValidator(group: AbstractControl): ValidationErrors | null {
  const next = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (next && confirm && next !== confirm) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.css',
})
export class EditProfile implements OnChanges, AfterViewInit, OnDestroy {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  readonly profileUpdated = output<GetUserInfoDTO>();

  readonly #fb = inject(FormBuilder);
  readonly #profileService = inject(ProfileService);
  readonly #geocodingService = inject(GeocodingService);
  readonly #destroy$ = new Subject<void>();
  readonly #platformId = inject(PLATFORM_ID);

  @ViewChild('mapContainer', { static: false }) mapElement!: ElementRef<HTMLDivElement>;

  // ── Section Editing Flags ─────────────────────────────────────────────────
  readonly isEditingImage = signal(false);
  readonly isEditingPersonal = signal(false);
  readonly isEditingLocation = signal(false);
  readonly isEditingPassword = signal(false);

  // ── Section Loading States ────────────────────────────────────────────────
  readonly isSavingImage = signal(false);
  readonly isSavingPersonal = signal(false);
  readonly isSavingLocation = signal(false);
  readonly isSavingPassword = signal(false);

  // ── Shared Feedback States ────────────────────────────────────────────────
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly showPassword = signal(false);
  readonly showNewPassword = signal(false);

  // ── Map state ─────────────────────────────────────────────────────────────
  readonly selectedLat = signal<number | null>(null);
  readonly selectedLng = signal<number | null>(null);
  readonly resolvedAddress = signal<string | null>(null);
  readonly isResolvingAddress = signal(false);

  // ── Map and Marker instances ──────────────────────────────────────────────
  map: google.maps.Map | null = null;
  marker: google.maps.Marker | null = null;

  // ── File state ────────────────────────────────────────────────────────────
  #selectedProfileImage: File | null = null;
  #selectedIdImage: File | null = null;
  readonly profileImagePreview = signal<string | null>(null);
  readonly idImagePreview = signal<string | null>(null);

  // ── Forms ──────────────────────────────────────────────────────────────────
  readonly personalForm: FormGroup = this.#fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
  });

  readonly passwordForm: FormGroup = this.#fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordMatchValidator, passwordConfirmValidator] },
  );

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
      const nameParts = info.fullName.trim().split(' ');

      // Patch Personal Form
      this.personalForm.patchValue({
        firstName: nameParts[0] ?? '',
        lastName: nameParts.slice(1).join(' ') ?? '',
      });

      // Disable forms initially by default
      if (!this.isEditingPersonal()) {
        this.personalForm.disable();
      }
      if (!this.isEditingPassword()) {
        this.passwordForm.disable();
      }

      // Update image previews from userInfo if not editing
      if (!this.isEditingImage()) {
        this.profileImagePreview.set(info.profileImage);
        this.idImagePreview.set(info.identificationImage);
      }

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

    const mapOptions: google.maps.MapOptions = {
      center: { lat: lat || EGYPT_LAT, lng: lng || EGYPT_LNG },
      zoom: lat && lng ? 13 : EGYPT_ZOOM,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    };

    if (this.mapElement?.nativeElement) {
      this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

      if (lat && lng) {
        this.marker = new google.maps.Marker({
          position: { lat, lng },
          map: this.map,
          draggable: this.isEditingLocation(),
        });

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
      this.marker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        draggable: this.isEditingLocation(),
      });

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
      navigator.geolocation.getCurrentPosition(
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

  // ── File handling ─────────────────────────────────────────────────────────

  onProfileImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.#selectedProfileImage = file;
    const reader = new FileReader();
    reader.onload = (e) => this.profileImagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  onIdImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.#selectedIdImage = file;
    const reader = new FileReader();
    reader.onload = (e) => this.idImagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const ctrl = this.personalForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  isPasswordInvalid(field: string): boolean {
    const ctrl = this.passwordForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  getPasswordError(): string | null {
    const ctrl = this.passwordForm.get('newPassword');
    if (!ctrl?.touched || !ctrl?.invalid) return null;
    if (ctrl.hasError('required')) return 'كلمة المرور الجديدة مطلوبة';
    if (ctrl.hasError('minlength')) return 'يجب أن تكون 8 أحرف على الأقل';
    if (ctrl.hasError('pattern')) return 'يجب أن تحتوي على حرف كبير وصغير ورقم ورمز خاص';
    return null;
  }

  get samePasswordError(): boolean {
    return !!(
      this.passwordForm.hasError('samePassword') && this.passwordForm.get('newPassword')?.touched
    );
  }

  get passwordMismatchError(): boolean {
    return !!(
      this.passwordForm.hasError('passwordMismatch') &&
      this.passwordForm.get('confirmPassword')?.touched
    );
  }

  // ── Edit/Cancel toggles ───────────────────────────────────────────────────

  togglePersonalEdit(edit: boolean): void {
    this.isEditingPersonal.set(edit);
    if (edit) {
      this.personalForm.enable();
    } else {
      this.personalForm.disable();
    }
  }

  togglePasswordEdit(edit: boolean): void {
    this.isEditingPassword.set(edit);
    if (edit) {
      this.passwordForm.enable();
    } else {
      this.passwordForm.disable();
    }
  }

  cancelPersonal(): void {
    this.togglePersonalEdit(false);
    this.saveError.set(null);
    const info = this.userInfo();
    if (info) {
      const nameParts = info.fullName.trim().split(' ');
      this.personalForm.patchValue({
        firstName: nameParts[0] ?? '',
        lastName: nameParts.slice(1).join(' ') ?? '',
      });
    }
  }

  cancelLocation(): void {
    this.isEditingLocation.set(false);
    this.saveError.set(null);
    const info = this.userInfo();
    if (info && info.homeLatitude && info.homeLongitude) {
      this.selectedLat.set(info.homeLatitude);
      this.selectedLng.set(info.homeLongitude);
      this.#updateMapAndMarker(info.homeLatitude, info.homeLongitude, 13);
    } else {
      this.resetMap();
    }
  }

  cancelImage(): void {
    this.isEditingImage.set(false);
    this.saveError.set(null);
    const info = this.userInfo();
    if (info) {
      this.profileImagePreview.set(info.profileImage);
      this.idImagePreview.set(info.identificationImage);
    } else {
      this.profileImagePreview.set(null);
      this.idImagePreview.set(null);
    }
    this.#selectedProfileImage = null;
    this.#selectedIdImage = null;
  }

  cancelPassword(): void {
    this.togglePasswordEdit(false);
    this.saveError.set(null);
    this.passwordForm.reset();
  }

  // ── Independent Save methods ────────────────────────────────────────────
  // Each one calls its own dedicated endpoint. None of them read from another
  // section's form/state, so editing one never sends or touches another.

  savePersonal(): void {
    if (this.personalForm.invalid || this.isSavingPersonal()) {
      this.personalForm.markAllAsTouched();
      return;
    }

    this.isSavingPersonal.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const dto: UpdateNameDTO = {
      firstName: this.personalForm.value.firstName,
      lastName: this.personalForm.value.lastName,
    };

    this.#profileService.updateName(dto).subscribe({
      next: () => {
        this.isSavingPersonal.set(false);
        this.togglePersonalEdit(false);
        this.saveSuccess.set(true);
        this.#refreshAndEmit();
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.isSavingPersonal.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مجدداً.';
        this.saveError.set(msg);
      },
    });
  }

  saveLocation(): void {
    const lat = this.selectedLat();
    const lng = this.selectedLng();
    if (lat === null || lng === null || this.isSavingLocation()) {
      return;
    }

    this.isSavingLocation.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const dto: UpdateHomeLocationDTO = { homeLatitude: lat, homeLongitude: lng };

    this.#profileService.updateHomeLocation(dto).subscribe({
      next: () => {
        this.isSavingLocation.set(false);
        this.isEditingLocation.set(false);
        this.saveSuccess.set(true);
        this.#refreshAndEmit();
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.isSavingLocation.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء حفظ الموقع. يرجى المحاولة مجدداً.';
        this.saveError.set(msg);
      },
    });
  }

  /**
   * Profile image and ID image are two separate endpoints. If the user
   * changed both before hitting "حفظ", fire both requests in parallel;
   * if only one changed, only that one is called.
   */
  saveImage(): void {
    if (this.isSavingImage()) return;

    const profileFile = this.#selectedProfileImage;
    const idFile = this.#selectedIdImage;

    if (!profileFile && !idFile) {
      this.isEditingImage.set(false);
      return;
    }

    this.isSavingImage.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const requests: Observable<ApiResponse<boolean>>[] = [];
    if (profileFile) {
      requests.push(this.#profileService.updateProfileImage({ profileImage: profileFile }));
    }
    if (idFile) {
      requests.push(this.#profileService.addIdImage({ identificationImage: idFile }));
    }

    forkJoin(requests).subscribe({
      next: () => {
        this.isSavingImage.set(false);
        this.isEditingImage.set(false);
        this.saveSuccess.set(true);
        this.#selectedProfileImage = null;
        this.#selectedIdImage = null;
        this.#refreshAndEmit();
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.isSavingImage.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء رفع الصور. يرجى المحاولة مجدداً.';
        this.saveError.set(msg);
      },
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid || this.isSavingPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSavingPassword.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const dto: ChangePasswordDTO = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
      // TODO: wire this up if your auth flow needs it to rotate the refresh token.
      // currentRefreshToken: this.#tokenService.getRefreshToken(),
    };

    this.#profileService.changePassword(dto).subscribe({
      next: () => {
        this.isSavingPassword.set(false);
        this.togglePasswordEdit(false);
        this.saveSuccess.set(true);
        this.passwordForm.reset();
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.isSavingPassword.set(false);
        const msg =
          err?.error?.message ??
          'كلمة المرور الحالية غير صحيحة أو حدث خطأ أثناء تغيير كلمة المرور.';
        this.saveError.set(msg);
      },
    });
  }

  /**
   * None of the 4 UserProfile endpoints return the updated profile — they
   * only return { success, message, data: true }. So after any successful
   * save we silently re-fetch GetInfo and push the fresh data up to
   * ProfileView, which is what actually keeps the sidebar/tabs in sync
   * and makes the change survive a refresh.
   */
  #refreshAndEmit(): void {
    this.#profileService.getUserInfo().subscribe({
      next: (res) => this.profileUpdated.emit(res.data),
      error: () => {
        // Non-fatal — the save itself already succeeded; a failed refresh
        // just means the UI won't reflect it until the next page load.
      },
    });
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
    this.#destroy$.complete();
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
