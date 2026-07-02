import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  inject,
  input,
  OnChanges,
  OnDestroy,
  output,
  PLATFORM_ID,
  signal,
  SimpleChanges,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Observable, Subject, switchMap } from 'rxjs';
import { GetUserInfoDTO, UpdateProfileInfoDTO } from '../../../../core/models/profile.model';
import { GeocodingService } from '../../../../core/services/gecoding.service';
import { ProfileService } from '../../../../core/services/profile.service';

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

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.css',
})
export class EditProfile implements OnChanges, AfterViewInit, OnDestroy {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  readonly profileUpdated = output<GetUserInfoDTO>();

  readonly #fb = inject(FormBuilder);
  readonly #profileService = inject(ProfileService);
  readonly #sanitizer = inject(DomSanitizer);
  readonly #geocodingService = inject(GeocodingService);
  readonly #destroy$ = new Subject<void>();
  readonly #platformId = inject(PLATFORM_ID);

  // ── Signals ───────────────────────────────────────────────────────────────
  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly showPassword = signal(false);
  readonly showNewPassword = signal(false);

  // ── Map state ─────────────────────────────────────────────────────────────
  readonly selectedLat = signal<number | null>(null);
  readonly selectedLng = signal<number | null>(null);
  readonly mapIframeSrc = signal<SafeResourceUrl>(
    this.#buildMapSrc(EGYPT_LAT, EGYPT_LNG, EGYPT_ZOOM),
  );
  readonly resolvedAddress = signal<string | null>(null);
  readonly isResolvingAddress = signal(false);

  // ── File state ────────────────────────────────────────────────────────────
  #selectedProfileImage: File | null = null;
  #selectedIdImage: File | null = null;
  readonly profileImagePreview = signal<string | null>(null);
  readonly idImagePreview = signal<string | null>(null);

  // ── Form ──────────────────────────────────────────────────────────────────
  readonly form: FormGroup = this.#fb.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
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
    },
    { validators: passwordMatchValidator },
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userInfo'] && this.userInfo()) {
      const info = this.userInfo()!;
      const nameParts = info.fullName.trim().split(' ');
      this.form.patchValue({
        firstName: nameParts[0] ?? '',
        lastName: nameParts.slice(1).join(' ') ?? '',
      });

      // Set map to user's saved location if available, else Egypt
      if (info.homeLatitude && info.homeLongitude) {
        this.selectedLat.set(info.homeLatitude);
        this.selectedLng.set(info.homeLongitude);
        this.mapIframeSrc.set(this.#buildMapSrc(info.homeLatitude, info.homeLongitude, 13));
        this.#reverseGeocode(info.homeLatitude, info.homeLongitude);
      }
    }
  }

  ngAfterViewInit(): void {
    this.#initGeocodePipeline();
    if (isPlatformBrowser(this.#platformId)) {
      // Listen for postMessage from the Google Maps embed when user clicks
      window.addEventListener('message', this.#onMapMessage.bind(this));
    }
  }

  // ── Map logic ─────────────────────────────────────────────────────────────

  #buildMapSrc(lat: number, lng: number, zoom: number): SafeResourceUrl {
    // Using Google Maps embed with place mode — clicking updates our signal via postMessage
    const url = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed&hl=ar`;
    return this.#sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /**
   * Google Maps embed does NOT send postMessage for clicks.
   * We use a visible lat/lng coordinate input as the primary picker,
   * and update the iframe preview whenever coordinates change.
   */
  onLatChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.selectedLat.set(val);
      this.#refreshMapIfReady();
    }
  }

  onLngChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.selectedLng.set(val);
      this.#refreshMapIfReady();
    }
  }

  #refreshMapIfReady(): void {
    const lat = this.selectedLat();
    const lng = this.selectedLng();
    if (lat !== null && lng !== null) {
      this.mapIframeSrc.set(this.#buildMapSrc(lat, lng, 13));
      this.#reverseGeocode(lat, lng);
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
        // catchError is already inside the service — this branch is belt-and-suspenders
        error: () => {
          this.isResolvingAddress.set(false);
        },
      });
  }

  #reverseGeocode(lat: number, lng: number): void {
    this.isResolvingAddress.set(true);
    this.#geocode$.next({ lat, lng });
  }

  resetToEgypt(): void {
    this.selectedLat.set(null);
    this.selectedLng.set(null);
    this.resolvedAddress.set(null);
    this.mapIframeSrc.set(this.#buildMapSrc(EGYPT_LAT, EGYPT_LNG, EGYPT_ZOOM));
  }

  #onMapMessage(event: MessageEvent): void {
    // Guard: only process messages that carry lat/lng
    if (
      event.data &&
      typeof event.data === 'object' &&
      'lat' in event.data &&
      'lng' in event.data
    ) {
      this.selectedLat.set(event.data.lat);
      this.selectedLng.set(event.data.lng);
      this.mapIframeSrc.set(this.#buildMapSrc(event.data.lat, event.data.lng, 13));
    }
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
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  getPasswordError(): string | null {
    const ctrl = this.form.get('newPassword');
    if (!ctrl?.touched || !ctrl?.invalid) return null;
    if (ctrl.hasError('required')) return 'كلمة المرور الجديدة مطلوبة';
    if (ctrl.hasError('minlength')) return 'يجب أن تكون 8 أحرف على الأقل';
    if (ctrl.hasError('pattern')) return 'يجب أن تحتوي على حرف كبير وصغير ورقم ورمز خاص';
    return null;
  }

  get samePasswordError(): boolean {
    return !!(this.form.hasError('samePassword') && this.form.get('newPassword')?.touched);
  }

  // ── Submit / Cancel ───────────────────────────────────────────────────────

  onCancel(): void {
    const info = this.userInfo();
    if (!info) return;
    const nameParts = info.fullName.trim().split(' ');
    this.form.patchValue({
      firstName: nameParts[0] ?? '',
      lastName: nameParts.slice(1).join(' ') ?? '',
      currentPassword: '',
      newPassword: '',
    });
    this.form.markAsPristine();
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.#selectedProfileImage = null;
    this.#selectedIdImage = null;
    this.profileImagePreview.set(null);
    this.idImagePreview.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const dto: UpdateProfileInfoDTO = {
      firstName: this.form.value.firstName,
      lastName: this.form.value.lastName,
      homeLatitude: this.selectedLat(),
      homeLongitude: this.selectedLng(),
      profileImage: this.#selectedProfileImage,
      identificationImage: this.#selectedIdImage,
      currentPassword: this.form.value.currentPassword,
      newPassword: this.form.value.newPassword,
    };

    this.#profileService.updateUserInfo(dto).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        this.profileUpdated.emit(updated);
        this.#selectedProfileImage = null;
        this.#selectedIdImage = null;
        this.form.patchValue({ currentPassword: '', newPassword: '' });
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مجدداً.';
        this.saveError.set(msg);
      },
    });
  }
  ngOnDestroy(): void {
    this.#destroy$.next();
    this.#destroy$.complete();
    this.#geocode$.complete();
    if (isPlatformBrowser(this.#platformId)) {
      window.removeEventListener('message', this.#onMapMessage.bind(this));
    }
  }
}
// function switchMap(
//   arg0: ({ lat, lng }: { lat: any; lng: any }) => Observable<string>,
// ): import('rxjs').OperatorFunction<{ lat: number; lng: number }, unknown> {
//   throw new Error('Function not implemented.');
//}
