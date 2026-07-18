import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
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
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Subject, switchMap, takeUntil } from 'rxjs';
import {
  ChangePasswordDTO,
  GetUserInfoDTO,
  UpdateHomeLocationDTO,
  UpdateNameDTO,
} from '../../model/profile.model';
import { ProfileService } from '../../service/profile.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../shared/enums/user-role';
import { VerificationStatus } from '../../../../shared/enums/verification-status';
import { SnackbarService } from '../../../../core/services/toast.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { ImageCropDialog } from '../../shared/image-crop-dialog/image-crop-dialog';
import { Toast } from '../../../../shared/components/toast/toast';
import { getRoleTranslationAr } from '../../../../core/constants/roles.dictionary';
import { getVerificationStatusTranslationAr } from '../../../../core/constants/verification.status.dictionary';
import { ViewProfilePopup } from '../../../../shared/components/view-profile-popup/view-profile-popup';

// ── Egypt center coordinates (default) ────────────────────────────────────
const EGYPT_LAT = 26.8206;
const EGYPT_LNG = 30.8025;
const EGYPT_ZOOM = 6;

// ── Profile photo upload constraints ───────────────────────────────────────
const ALLOWED_PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// ── Custom validator: passwords match ──────────────────────────────────────
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const current = group.get('currentPassword')?.value;
  const next = group.get('newPassword')?.value;
  if (next && current && current === next) {
    return { samePassword: true };
  }
  return null;
}


@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    NgTemplateOutlet,
    Toast,
    ConfirmDialog,
    ImageCropDialog,
    ViewProfilePopup,
  ],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.css',
})
export class EditProfile implements OnChanges, AfterViewInit, OnDestroy {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  readonly profileUpdated = output<GetUserInfoDTO>();

  readonly #fb = inject(FormBuilder);
  readonly #profileService = inject(ProfileService);
  readonly #geocodingService = inject(GeocodingService);
  readonly #snackbar = inject(SnackbarService);
  readonly #authService = inject(AuthService);
  readonly #destroy$ = new Subject<void>();
  readonly #platformId = inject(PLATFORM_ID);

  @ViewChild('mapContainer', { static: false }) mapElement!: ElementRef<HTMLDivElement>;

  // ── Section Editing Flags ─────────────────────────────────────────────────
  // The profile photo and the ID image both use the same edit/save/cancel
  // batch flow: click "تعديل" → pick/crop a file → "حفظ" uploads it, or
  // "إلغاء" discards the pending change. "Remove Photo" stays independent of
  // this toggle and acts instantly (confirm → remove).
  readonly isEditingIdImage = signal(false);
  readonly isEditingProfileImage = signal(false);
  readonly isEditingPersonal = signal(false);
  readonly isEditingLocation = signal(false);
  readonly isEditingPassword = signal(false);
  readonly isEditingPhone = signal(false);
  readonly imageFile = input<File | null>(null);

  // ── Section Loading States ────────────────────────────────────────────────
  readonly isSavingIdImage = signal(false);
  readonly isSavingPersonal = signal(false);
  readonly isSavingLocation = signal(false);
  readonly isSavingPassword = signal(false);
  readonly isSavingPhone = signal(false);

  // ── Profile photo state ────────────────────────────────────────────────────
  // isUploadingProfileImage doubles as the "saving" flag for the profile
  // photo's edit/save/cancel flow (equivalent to isSavingIdImage). Removal
  // stays a separate, instant action independent of edit mode.
  readonly isUploadingProfileImage = signal(false);
  readonly isRemovingProfileImage = signal(false);
  readonly showRemoveConfirm = signal(false);

  // ── Crop dialog state (shared by profile photo + ID image) ───────────────
  readonly showCropDialog = signal(false);
  readonly cropSourceFile = signal<File | null>(null);
  // Which field the current crop session is for. The cropper itself is now
  // fully free-form and has no notion of "profile" vs "id" — this only
  // decides where onCropSaved routes the resulting Blob.
  #cropTarget: 'profile' | 'id' = 'profile';

  // ── Shared Feedback States ────────────────────────────────────────────────
  // Success/error feedback for every save/upload/remove action is now shown
  // via the global SnackbarService/<app-toast />, not local signals/banners.
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
  #selectedIdImage: File | null = null;
  // Cropped file pending upload for the profile photo's batch edit/save flow.
  #selectedProfileImage: File | null = null;
  // Kept so a failed "remove" can restore exactly what was on screen before.
  #previousProfileImageUrl: string | null = null;
  readonly profileImagePreview = signal<string | null>(null);
  readonly idImagePreview = signal<string | null>(null);
  readonly filledIconStyle = "'FILL' 1";

  // ── Forms ──────────────────────────────────────────────────────────────────
  readonly personalForm: FormGroup = this.#fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern('^[a-zA-Z\u0600-\u06FF]+$')]],
    lastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern('^[a-zA-Z\u0600-\u06FF]+( [a-zA-Z\u0600-\u06FF]+)*$')]],
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
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])\S+$/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordMatchValidator, mustMatch('newPassword', 'confirmPassword')] },
  );

  readonly phoneForm: FormGroup = this.#fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)]],
  });

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

      // Patch Phone Form
      this.phoneForm.patchValue({
        phoneNumber: info.phoneNumber ?? '',
      });

      // Disable forms initially by default
      if (!this.isEditingPersonal()) {
        this.personalForm.disable();
      }
      if (!this.isEditingPassword()) {
        this.passwordForm.disable();
      }
      if (!this.isEditingPhone()) {
        this.phoneForm.disable();
      }

      // Sync the profile photo preview from server data, unless we're
      // mid-upload/mid-removal/mid-edit — those flows manage the preview
      // themselves (optimistic clear/preview) and would otherwise get
      // clobbered by a stale value here.
      if (
        !this.isUploadingProfileImage() &&
        !this.isRemovingProfileImage() &&
        !this.isEditingProfileImage()
      ) {
        this.profileImagePreview.set(info.profileImage);
      }

      if (!this.isEditingIdImage()) {
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

  get isModerator(): boolean {
    return this.userInfo()?.role === UserRole.Moderator;
  }
  get isAdmin(): boolean {
    return this.userInfo()?.role === UserRole.Admin;
  }
  get isVerified(): boolean {
    return this.userInfo()?.verificationStatus === VerificationStatus.Verified;
  }

  getRoleName(roleName: string | undefined): string {
    return getRoleTranslationAr(roleName);
  }
  getVerificationStatus(ver: string | undefined): string {
    return getVerificationStatusTranslationAr(ver);
  }
  get verificationLabel(): string {
    if (this.userInfo()?.role === UserRole.Moderator) {
      return this.getRoleName(UserRole.Moderator);
    } else if (this.userInfo()?.role === UserRole.Admin) {
      return this.getRoleName(UserRole.Admin);
    } else if (this.userInfo()?.verificationStatus === VerificationStatus.Verified) {
      return this.getVerificationStatus(VerificationStatus.Verified);
    } else if (this.userInfo()?.verificationStatus === VerificationStatus.Pending) {
      return this.getVerificationStatus(VerificationStatus.Pending);
    } else {
      return getVerificationStatusTranslationAr(VerificationStatus.Unverified);
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

  // ── Shared image validation (used by both profile photo + ID image) ──────

  /** Returns true if the file passes type/size checks; shows a toast and

-    returns false otherwise. */
  #validateImageFile(file: File): boolean {
    if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
      this.#snackbar.error('صيغة الصورة غير مدعومة. يُسمح فقط بـ JPG أو PNG أو WEBP.');
      return false;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      this.#snackbar.error('حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت).');
      return false;
    }

    return true;
  }

  // ── Profile photo: select → validate → crop → upload ─────────────────────

  /**

-    Triggered by the (hidden) file input under the profile photo.
-    Validates type/size _before_ opening the crop dialog — per spec, a
-    failing file never reaches the cropper and the current photo is left
-    untouched.
     */
  onProfilePhotoFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] ?? null;
    inputEl.value = '';

    if (!file) return;

    if (!this.#validateImageFile(file)) return;

    this.#cropTarget = 'profile';
    this.cropSourceFile.set(file);
    this.showCropDialog.set(true);
  }

  onCropCancelled(): void {
    this.showCropDialog.set(false);
    this.cropSourceFile.set(null);
  }

  /**

-    The crop dialog only ever hands back a Blob when the user clicks
-    "حفظ" — the original image on screen is untouched until this fires.
-    Branches on #cropTarget: the profile photo uploads immediately
-    (optimistic preview → upload → refresh → toast), while the ID image
-    just updates its preview and stores the cropped File — it still goes
-    through the existing edit/save/cancel batch flow via saveIdImage().
     */
  onCropSaved(blob: Blob): void {
    this.showCropDialog.set(false);
    this.cropSourceFile.set(null);

    const objectUrl = URL.createObjectURL(blob);

    if (this.#cropTarget === 'id') {
      const croppedFile = new File([blob], `id-${Date.now()}.png`, { type: 'image/png' });
      this.idImagePreview.set(objectUrl);
      this.#selectedIdImage = croppedFile;
      return;
    }

    const croppedFile = new File([blob], `profile-${Date.now()}.png`, { type: 'image/png' });

    // Preview the crop immediately, but nothing uploads until "حفظ" is
    // clicked in saveProfileImage() — same batch flow as the ID image.
    this.profileImagePreview.set(objectUrl);
    this.#selectedProfileImage = croppedFile;
  }

  #uploadProfilePhoto(file: File): void {
    if (this.isUploadingProfileImage()) return;

    this.isUploadingProfileImage.set(true);

    this.#profileService.updateProfileImage({ profileImage: file }).subscribe({
      next: () => {
        this.isUploadingProfileImage.set(false);
        this.isEditingProfileImage.set(false);
        this.#selectedProfileImage = null;
        this.#snackbar.success('تم تحديث الصورة الشخصية بنجاح');
        this.#refreshAndEmit();
      },
      error: (err) => {
        this.isUploadingProfileImage.set(false);
        const msg =
          err?.error?.message ?? 'حدث خطأ أثناء رفع الصورة الشخصية. يرجى المحاولة مجدداً.';
        this.#snackbar.error(msg);
        // Fall back to whatever the server last had, since the optimistic
        // preview never actually made it to the backend. Edit mode stays
        // open so the user can pick another file or cancel.
        this.profileImagePreview.set(this.userInfo()?.profileImage ?? null);
        this.#selectedProfileImage = null;
      },
    });
  }

  // ── Profile photo: remove ─────────────────────────────────────────────────

  requestRemoveProfilePhoto(): void {
    if (!this.profileImagePreview() || this.isRemovingProfileImage()) return;
    this.showRemoveConfirm.set(true);
  }

  cancelRemoveProfilePhoto(): void {
    this.showRemoveConfirm.set(false);
  }

  confirmRemoveProfilePhoto(): void {
    if (this.isRemovingProfileImage()) return;

    this.isRemovingProfileImage.set(true);

    this.#profileService.removeProfileImage().subscribe({
      next: () => {
        this.isRemovingProfileImage.set(false);

        this.showRemoveConfirm.set(false);
        this.profileImagePreview.set(null);

        this.#snackbar.success('تم حذف الصورة الشخصية بنجاح');

        this.#refreshAndEmit();
      },
      error: (err) => {
        this.isRemovingProfileImage.set(false);

        this.#snackbar.error(err?.error?.message ?? 'حدث خطأ أثناء حذف الصورة الشخصية');
      },
    });
  }

  // ── ID image: select → validate → crop ─────────────────────────────────────
  // Save/cancel still go through the pre-existing batch flow
  // (toggleIdImageEdit / saveIdImage / cancelIdImage below).

  /**

-    Triggered by the (hidden) file input under the ID photo. Same
-    type/size validation as the profile photo, then opens the shared crop
-    dialog instead of reading the raw file straight into the preview.
     */
  onIdImageSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] ?? null;
    inputEl.value = '';

    if (!file) return;

    if (!this.#validateImageFile(file)) return;

    this.#cropTarget = 'id';
    this.cropSourceFile.set(file);
    this.showCropDialog.set(true);
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

  isPhoneFieldInvalid(field: string): boolean {
    const ctrl = this.phoneForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  getPasswordError(): string | null {
    const ctrl = this.passwordForm.get('newPassword');
    if (!ctrl?.touched || !ctrl?.invalid) return null;
    if (ctrl.hasError('required')) return 'كلمة المرور الجديدة مطلوبة';
    if (ctrl.hasError('minlength') || ctrl.hasError('maxlength') || ctrl.hasError('pattern')) 
      return 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل ولا تزيد عن 50، وأن تتضمن حرفًا كبيرًا، وحرفًا صغيرًا، ورقمًا، ورمزًا خاصًا، وبدون مسافات.';
    return null;
  }

  get samePasswordError(): boolean {
    return !!(
      this.passwordForm.hasError('samePassword') && this.passwordForm.get('newPassword')?.touched
    );
  }

  get passwordMismatchError(): boolean {
    return !!(
      this.passwordForm.get('confirmPassword')?.hasError('mustMatch') &&
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

  togglePhoneEdit(edit: boolean): void {
    this.isEditingPhone.set(edit);
    if (edit) {
      this.phoneForm.enable();
    } else {
      this.phoneForm.disable();
    }
  }

  toggleIdImageEdit(edit: boolean): void {
    this.isEditingIdImage.set(edit);
  }

  toggleProfileImageEdit(edit: boolean): void {
    this.isEditingProfileImage.set(edit);
  }

  cancelPersonal(): void {
    this.togglePersonalEdit(false);
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
    const info = this.userInfo();
    if (info && info.homeLatitude && info.homeLongitude) {
      this.selectedLat.set(info.homeLatitude);
      this.selectedLng.set(info.homeLongitude);
      this.#updateMapAndMarker(info.homeLatitude, info.homeLongitude, 13);
    } else {
      this.resetMap();
    }
  }

  cancelIdImage(): void {
    this.toggleIdImageEdit(false);
    const info = this.userInfo();
    this.idImagePreview.set(info?.identificationImage ?? null);
    this.#selectedIdImage = null;
  }

  cancelProfileImage(): void {
    this.toggleProfileImageEdit(false);
    const info = this.userInfo();
    this.profileImagePreview.set(info?.profileImage ?? null);
    this.#selectedProfileImage = null;
  }

  cancelPassword(): void {
    this.togglePasswordEdit(false);
    this.passwordForm.reset();
  }

  cancelPhone(): void {
    this.phoneForm.patchValue({
      phoneNumber: this.userInfo()?.phoneNumber ?? '',
    });
    this.phoneForm.markAsPristine();
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

    const dto: UpdateNameDTO = {
      firstName: this.personalForm.value.firstName.trim(),
      lastName: this.personalForm.value.lastName.trim(),
    };

    this.#profileService.updateName(dto).subscribe({
      next: () => {
        this.isSavingPersonal.set(false);
        this.togglePersonalEdit(false);
        this.#snackbar.success('تم حفظ التغييرات بنجاح');
        this.#refreshAndEmit();
      },
      error: (err) => {
        this.isSavingPersonal.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مجدداً.';
        this.#snackbar.error(msg);
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

    const dto: UpdateHomeLocationDTO = { homeLatitude: lat, homeLongitude: lng };

    this.#profileService.updateHomeLocation(dto).subscribe({
      next: () => {
        this.isSavingLocation.set(false);
        this.isEditingLocation.set(false);
        this.#snackbar.success('تم حفظ الموقع بنجاح');
        this.#refreshAndEmit();
      },
      error: (err) => {
        this.isSavingLocation.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء حفظ الموقع. يرجى المحاولة مجدداً.';
        this.#snackbar.error(msg);
      },
    });
  }

  saveIdImage(): void {
    if (this.isSavingIdImage()) return;

    const idFile = this.#selectedIdImage;

    if (!idFile) {
      this.toggleIdImageEdit(false);
      return;
    }

    this.isSavingIdImage.set(true);

    this.#profileService.addIdImage({ identificationImage: idFile }).subscribe({
      next: () => {
        this.isSavingIdImage.set(false);
        this.toggleIdImageEdit(false);
        this.#selectedIdImage = null;
        this.#snackbar.success('تم تحديث صورة الهوية بنجاح');
        this.#refreshAndEmit();
      },
      error: (err) => {
        this.isSavingIdImage.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء رفع صورة الهوية. يرجى المحاولة مجدداً.';
        this.#snackbar.error(msg);
      },
    });
  }
 
  /**

-    Profile photo — uploads the pending cropped file (if any) via the
-    shared #uploadProfilePhoto helper, which closes edit mode and clears
-    #selectedProfileImage itself once the request settles.
     */
  saveProfileImage(): void {
    if (this.isUploadingProfileImage()) return;

    const profileFile = this.#selectedProfileImage;

    if (!profileFile) {
      this.toggleProfileImageEdit(false);
      return;
    }

    this.#uploadProfilePhoto(profileFile);
  }

  savePassword(): void {
    console.log(this.passwordForm.value);
    console.log(this.passwordForm.get('newPassword')?.errors);
    console.log(this.passwordForm.errors);
    console.log(this.passwordForm.valid);
    if (this.passwordForm.invalid || this.isSavingPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSavingPassword.set(true);

    const dto: ChangePasswordDTO = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
      // TODO: wire this up if your auth flow needs it to rotate the refresh token.
      // currentRefreshToken: this.#tokenService.getRefreshToken(),
    };

    this.#authService.changePassword(dto).subscribe({
      next: () => {
        this.isSavingPassword.set(false);
        this.togglePasswordEdit(false);
        this.#snackbar.success('تم تغيير كلمة المرور بنجاح');
        this.passwordForm.reset();
      },
      error: (err) => {
        this.isSavingPassword.set(false);
        const msg =
          err?.error?.message ??
          'كلمة المرور الحالية غير صحيحة أو حدث خطأ أثناء تغيير كلمة المرور.';
        this.#snackbar.error(msg);
      },
    });
  }

  /**

-    Phone number save — dedicated endpoint, same independent-section
-    pattern as savePersonal/saveLocation/savePassword. Relies on
-    #refreshAndEmit() to pull the fresh GetUserInfoDTO from the server
-    (UpdatePhoneNumber only returns a bool, not the updated user).
     */
  savePhoneNumber(): void {
    if (this.phoneForm.invalid || this.isSavingPhone()) {
      this.phoneForm.markAllAsTouched();
      return;
    }

    this.isSavingPhone.set(true);

    const phoneNumber = this.phoneForm.value.phoneNumber as string;

    this.#profileService
      .updatePhoneNumber(phoneNumber)
      .pipe(takeUntil(this.#destroy$))
      .subscribe({
        next: () => {
          this.isSavingPhone.set(false);
          this.togglePhoneEdit(false);
          this.#snackbar.success('تم تغيير رقم الهاتف بنجاح');
          this.#refreshAndEmit();
        },
        error: (err) => {
          this.isSavingPhone.set(false);
          const msg = err?.error?.message ?? 'حدث خطأ اثناء تغيير رقم الهاتف';
          this.#snackbar.error(msg);
        },
      });
  }

  /**

- None of the UserProfile endpoints return the updated profile — they
- only return { success, message, data: true }. So after any successful
- save we silently re-fetch GetInfo and push the fresh data up to
- ProfileView, which is what actually keeps the sidebar/tabs in sync
- and makes the change survive a refresh.
  */
  #refreshAndEmit(): void {
    this.#profileService.getUserInfo().subscribe({
      next: (res) => {
        if (res.data) {
          this.profileUpdated.emit(res.data);
        }
      },
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
