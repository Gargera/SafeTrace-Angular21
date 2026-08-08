import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { UrgentCaseService } from '../../services/urgent-case.service';
import { UrgentCaseUpdateRequest } from '../../models/request/UrgentCaseUpdateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/dictionaries/relation.type.dictionary';
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from '../../../../core/constants/governorates';
import { getFormFieldError, isFieldInvalid } from '../../../../shared/helper/form-validation.helper';
import { MapLocationPickerComponent } from '../../../../shared/components/map-location-picker/components/map-location-picker';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { CardComponent } from '../../../../shared/components/card/card';

// Shared validators
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { urgentEventDate, toDatetimeLocalString } from '../../../../shared/validators/urgent-event-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { ImageService } from '../../../../shared/services/image.service';

import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';

import { GeocodingService } from '../../../../core/services/geocoding/geocoding.service';
import { CaseFileResponse } from '../../../../core/models/cases.model';
import { validateVideoFile} from '../../../../shared/validators/video-validation.validator';


type Step = 1 | 2 | 3;

@Component({
  selector: 'app-urgent-update',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MapLocationPickerComponent,
    ButtonComponent,
    FormField,
    CardComponent,
    HeaderComponent,
    ConfirmationModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./urgent-update.css'],
  templateUrl: './urgent-update.html',
})
export class UrgentUpdate implements OnInit {
  private fb = inject(FormBuilder);
  private imageService = inject(ImageService);
  private destroyRef = inject(DestroyRef);

  // Allowed datetime range for urgent cases (last 6 hours)
  readonly minEventDate = computed(() => {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    return toDatetimeLocalString(sixHoursAgo);
  });

  readonly maxEventDate = computed(() => {
    const now = new Date();
    return toDatetimeLocalString(now);
  });
  private service = inject(UrgentCaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackbar = inject(SnackbarService);
  private geocoding = inject(GeocodingService);

  caseId!: number;
  currentStep: Step = 1;
  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  showDeleteImageConfirm = signal(false);
  photoToDelete = signal<CaseFileResponse | null>(null);

  existingPhotos = signal<CaseFileResponse[]>([]);
  deletedPhotoIds = signal<number[]>([]);
  primaryPhotoId = signal<number | null>(null);

  newPhotos = signal<File[]>([]);
  newPhotoPreviews = signal<string[]>([]);
  newPrimaryImage = signal<File | null>(null);
  newPrimaryPreview = signal<string | null>(null);
  newPrimaryError = signal<string | null>(null);
  newPhotosError = signal<string | null>(null);

  existingVideoUrl = signal<string | null>(null);
  videoFile = signal<File | null>(null);
  videoError = signal<string | null>(null);

  selectedLat = signal<number | null>(null);
  selectedLng = signal<number | null>(null);
  selectedAddress = signal<string>('');
  /** initial coords passed to the map picker so it centers on the existing location */
  initialMapCenter = signal<{ lat: number; lng: number } | null>(null);
  isMapModalOpen = signal(false);

  isLocating = signal(false);
  locationError = signal<string | null>(null);

  readonly genders = Gender;
  readonly relationOptions = RELATION_TYPE_OPTIONS;
  readonly governorates = EGYPT_GOVERNORATES;
  readonly today = new Date().toISOString().split('T')[0];

  readonly steps = [
    { num: 1, label: 'بيانات الشخص' },
    { num: 2, label: 'موقع الحادث' },
    { num: 3, label: 'صور' },
  ];

  get stepTitle(): string {
    return ['بيانات الشخص', 'موقع الحادث على الخريطة', 'صور'][this.currentStep - 1];
  }

  // ─────────────────────────────────────────────────────────────
  // Form definition — validators match backend exactly (Update)
  // ─────────────────────────────────────────────────────────────
  form = this.fb.group({
    fName: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    sName: ['', [arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    tName: ['', [arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    lName: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(120)]],
    gender: ['' as Gender | '', [Validators.required, validEnum(Gender)]],
    // Relation is optional on Update
    relation: [null as RelationType | null, [validEnum(RelationType)]],
    // Phone — optional, Egyptian format, max 15
    communicationPhone: ['', [egyptianPhone(), Validators.maxLength(15)]],
    description: ['', [Validators.maxLength(2000)]],
    government: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(100)]],
    city: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(100)]],
    street: ['', [Validators.required, Validators.maxLength(200)]],
    eventDate: ['', [Validators.required, urgentEventDate()]],
  });

  // ─────────────────────────────────────────────────────────────
  // Error message helper
  // ─────────────────────────────────────────────────────────────
  getFieldError(field: string): string | null {
    return getFormFieldError(this.form, field);
  }

  isInvalid(field: string): boolean {
    return isFieldInvalid(this.form, field);
  }

  availableCities = signal<string[]>([]);

  ngOnInit(): void {
    this.caseId = Number(this.route.snapshot.paramMap.get('id'));

    this.form.get('government')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((gov) => {
        const cities = getCitiesForGovernorate(gov);
        this.availableCities.set(cities);
        const currentCity = this.form.get('city')?.value;
        if (currentCity && !cities.includes(currentCity)) {
          this.form.get('city')?.setValue('');
        }
      });

    this.loadCase();
  }

  /**
   * The backend (local FileStorageService) returns RELATIVE paths only
   * (e.g. "/Images/UrgentCase/xxx.jpg"). Without prefixing environment.baseUrl,
   * <img src> resolves against the Angular app's own origin instead of the API.
   * Kept forward-compatible: an already-absolute URL (e.g. future S3) passes through.
   */
  private resolveMediaUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${environment.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private loadCase(): void {
    this.isLoading.set(true);
    this.service
      .getMyCaseById(this.caseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const c = res.data;
          if (!c) {
            this.isLoading.set(false);
            return;
          }
          const gov = c.government ?? '';
          this.availableCities.set(getCitiesForGovernorate(gov));

          this.form.patchValue({
            fName: c.fName ?? '',
            sName: c.sName ?? '',
            tName: c.tName ?? '',
            lName: c.lName ?? '',
            age: c.age ?? null,
            gender: c.gender ?? '',
            relation: c.relation ?? null,
            communicationPhone: c.communicationPhone ?? '',
            description: c.description ?? '',
            government: c.government ?? '',
            city: c.city ?? '',
            street: c.street ?? '',
            eventDate: c.eventDate ? toDatetimeLocalString(new Date(String(c.eventDate))) : '',
          });

          if (c.latitude != null && c.longitude != null) {
            this.selectedLat.set(c.latitude);
            this.selectedLng.set(c.longitude);
            this.initialMapCenter.set({ lat: c.latitude, lng: c.longitude });
            this.geocoding
              .reverseGeocode(c.latitude, c.longitude)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (addr) => this.selectedAddress.set(addr),
                error: () => this.selectedAddress.set(`${c.latitude!.toFixed(4)}, ${c.longitude!.toFixed(4)}`),
              });
          }

          const rawFiles: CaseFileResponse[] = c.photos ?? [];
          const files: CaseFileResponse[] = rawFiles.map((f) => ({
            ...f,
            imagePath: this.resolveMediaUrl(f.imagePath) ?? f.imagePath,
          }));
          this.existingPhotos.set(files);
          this.primaryPhotoId.set(files.find((f) => f.isPrimary)?.id ?? null);
          this.existingVideoUrl.set(this.resolveMediaUrl(c.video ?? null));

          this.isLoading.set(false);
        },
        error: (err: unknown) => {
          this.isLoading.set(false);
          const msg = extractErrorMessage(err, 'تعذر تحميل بيانات الحالة.');
          this.errorMsg.set(msg);
        },
      });
  }

  onLocationChange(loc: { lat: number; lng: number; address: string }): void {
    this.selectedLat.set(loc.lat);
    this.selectedLng.set(loc.lng);
    this.selectedAddress.set(loc.address);
  }

  openMapModal(): void {
    this.isMapModalOpen.set(true);
  }

  closeMapModal(): void {
    this.isMapModalOpen.set(false);
  }

  onMapLocationConfirmed(loc: { lat: number; lng: number; address: string }): void {
    this.selectedLat.set(loc.lat);
    this.selectedLng.set(loc.lng);
    this.selectedAddress.set(loc.address);
    this.initialMapCenter.set({ lat: loc.lat, lng: loc.lng });
    this.isMapModalOpen.set(false);
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.locationError.set('المتصفح لا يدعم تحديد الموقع الجغرافي.');
      return;
    }

    this.isLocating.set(true);
    this.locationError.set(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.geocoding
          .reverseGeocode(lat, lng)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (address) => {
              this.onLocationChange({ lat, lng, address });
              this.isLocating.set(false);
            },
            error: () => {
              this.onLocationChange({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
              this.isLocating.set(false);
            },
          });
      },
      (error: GeolocationPositionError) => {
        this.isLocating.set(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError.set('تم رفض إذن الوصول لموقعك. من فضلك فعّل صلاحية الموقع من إعدادات المتصفح.');
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError.set('تعذر تحديد موقعك الحالي.');
            break;
          case error.TIMEOUT:
            this.locationError.set('انتهت مهلة تحديد الموقع، حاول مرة أخرى.');
            break;
          default:
            this.locationError.set('حدث خطأ أثناء تحديد الموقع.');
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      const fields = ['fName', 'lName', 'age', 'gender', 'communicationPhone'];
      fields.forEach((f) => this.form.get(f)?.markAsTouched());
      if (fields.some((f) => this.form.get(f)?.invalid)) return;
    }
    if (this.currentStep === 2) {
      const fields = ['government', 'city', 'street', 'eventDate'];
      fields.forEach((f) => this.form.get(f)?.markAsTouched());
      if (fields.some((f) => this.form.get(f)?.invalid)) return;
      if (this.selectedLat() === null || this.selectedLng() === null) {
        this.errorMsg.set('من فضلك حدد موقع الحادث على الخريطة.');
        return;
      }
    }
    this.errorMsg.set(null);
    this.currentStep = (this.currentStep + 1) as Step;
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep = (this.currentStep - 1) as Step;
  }

  // ─────────────────────────────────────────────────────────────
  // Photo management — file type/size validation
  // ─────────────────────────────────────────────────────────────

  confirmRemoveExistingPhoto(photo: CaseFileResponse): void {
    this.photoToDelete.set(photo);
    this.showDeleteImageConfirm.set(true);
  }

  executeRemoveExistingPhoto(): void {
    const photo = this.photoToDelete();
    if (photo) {
      this.deletedPhotoIds.update((ids) => [...ids, photo.id]);
      this.existingPhotos.update((photos) => photos.filter((p) => p.id !== photo.id));
      if (this.primaryPhotoId() === photo.id) {
        const next = this.existingPhotos()[0];
        this.primaryPhotoId.set(next ? next.id : null);
      }
    }
    this.showDeleteImageConfirm.set(false);
    this.photoToDelete.set(null);
  }

  setExistingAsPrimary(photo: CaseFileResponse): void {
    this.primaryPhotoId.set(photo.id);
    this.newPrimaryImage.set(null);
    this.newPrimaryPreview.set(null);
  }

  onNewPrimarySelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;

    const validation = this.imageService.validate(file, 5);
    if (!validation.valid) {
      this.newPrimaryError.set(validation.errorMessage ?? null);
      return;
    }

    this.newPrimaryError.set(null);
    this.newPrimaryImage.set(file);
    this.newPrimaryPreview.set(URL.createObjectURL(file));
    this.primaryPhotoId.set(null);
  }

  clearNewPrimary(): void {
    this.newPrimaryImage.set(null);
    this.newPrimaryPreview.set(null);
    this.newPrimaryError.set(null);
  }

  onNewPhotosSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    for (const f of files) {
      const validation = this.imageService.validate(f, 5);
      if (!validation.valid) {
        this.newPhotosError.set(validation.errorMessage ?? null);
        return;
      }
    }
    this.newPhotosError.set(null);
    this.newPhotos.update((p) => [...p, ...files].slice(0, 5));
    this.newPhotoPreviews.set(this.newPhotos().map((f) => URL.createObjectURL(f)));
  }

  removeNewPhoto(index: number): void {
    this.newPhotos.update((p) => p.filter((_, i) => i !== index));
    this.newPhotoPreviews.update((p) => p.filter((_, i) => i !== index));
  }

 
onVideoSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;

  if (!file) {
    return;
  }

  const validation = validateVideoFile(file, 50);

  if (!validation.valid) {
    this.videoFile.set(null);
    this.videoError.set(
      validation.errorMessage ?? 'الفيديو غير صالح.'
    );

    input.value = '';
    return;
  }

  this.videoError.set(null);
  this.videoFile.set(file);
}



  onSubmit(): void {
    if (this.isSubmitting()) return;
    const noPhotoLeft = this.existingPhotos().length === 0 && !this.newPrimaryImage() && this.newPhotos().length === 0;
    if (this.form.invalid || noPhotoLeft || this.selectedLat() === null) {
      this.form.markAllAsTouched();
      if (noPhotoLeft) this.errorMsg.set('لازم يفضل في صورة واحدة على الأقل للحالة.');
      else if (this.selectedLat() === null) this.errorMsg.set('من فضلك حدد موقع الحادث على الخريطة.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set(null);

    const v = this.form.getRawValue();

    const request: UrgentCaseUpdateRequest = {
      fName: v.fName!,
      lName: v.lName!,
      sName: v.sName || null,
      tName: v.tName || null,
      gender: v.gender as Gender,
      age: v.age!,
      relation: v.relation as RelationType,
      communicationPhone: v.communicationPhone || null,
      description: v.description || null,
      government: v.government!,
      city: v.city!,
      street: v.street!,
      eventDate: v.eventDate ? new Date(v.eventDate).toISOString() : v.eventDate!,
      primaryImage: this.newPrimaryImage(),
      newPhotos: this.newPhotos().length ? this.newPhotos() : null,
      deletedPhotoIds: this.deletedPhotoIds().length ? this.deletedPhotoIds() : null,
      primaryPhotoId: this.primaryPhotoId(),
      video: this.videoFile(),
      latitude: this.selectedLat()!,
      longitude: this.selectedLng()!,
    };

    this.service
      .updateCase(this.caseId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.snackbar.success('تم تحديث بيانات الحالة بنجاح.');
          this.router.navigate(['/urgent', this.caseId]);
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          const msg = extractErrorMessage(err, 'حدث خطأ أثناء حفظ التعديلات. حاول مرة أخرى.');
          
          if (msg.includes('يجب أن تكون لنفس الشخص') || msg.includes('لا تبدو لنفس الشخص')) {
            this.newPrimaryError.set(msg);
            this.newPhotosError.set(msg);
            return;
          }

          if (err && typeof err === 'object' && 'status' in err && (err as any).status === 400) {
            const errorObj = (err as any).error;
            if (errorObj?.errors) {
              let hasUnmappedErrors = false;
              for (const key in errorObj.errors) {
                const controlName = key.charAt(0).toLowerCase() + key.slice(1);
                const control = this.form.get(controlName);
                if (control) {
                  control.setErrors({ serverError: errorObj.errors[key][0] });
                } else {
                  hasUnmappedErrors = true;
                  this.errorMsg.set(errorObj.errors[key][0]);
                }
              }
              if (!hasUnmappedErrors) {
                this.errorMsg.set(null);
              }
            } else {
              this.errorMsg.set(msg);
            }
          } else {
            this.snackbar.error(msg);
          }
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/urgent', this.caseId]);
  }
}
