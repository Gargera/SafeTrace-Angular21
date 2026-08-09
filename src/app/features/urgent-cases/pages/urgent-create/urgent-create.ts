import { Component, inject, signal, computed, ChangeDetectionStrategy, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { UrgentCaseService } from '../../services/urgent-case.service';
import { UrgentCaseCreateRequest } from '../../models/request/UrgentCaseCreateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { CaseType } from '../../../../shared/enums/case-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/dictionaries/relation.type.dictionary';
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from '../../../../core/constants/governorates';
import { getFormFieldError, isFieldInvalid } from '../../../../shared/helper/form-validation.helper';
import { MapLocationPickerComponent } from '../../../../shared/components/map-location-picker/components/map-location-picker';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ForceCreatePopupComponent } from '../../../../shared/components/cases-components/force-create-popup/force-create-popup.component';
import { MatchedCaseResponse } from '../../../../core/models/cases.model';
import { DuplicateDecision } from '../../../../shared/enums/duplicate-decision';
import { DuplicateInfoDialogComponent } from '../../../../shared/components/cases-components/duplicate-info-dialog/duplicate-info-dialog.component';
import { GeocodingService } from '../../../../core/services/geocoding/geocoding.service';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { CacheService } from '../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';


import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { urgentEventDate, toDatetimeLocalString, URGENT_EVENT_MAX_AGE_HOURS } from '../../../../shared/validators/urgent-event-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { validCity } from '../../../../shared/validators/city.validator';
import { validGovernorate } from '../../../../shared/validators/governorate.validator';
import { ImageService } from '../../../../shared/services/image.service';
import { validateVideoFile} from '../../../../shared/validators/video-validation.validator';
import { CardComponent } from '../../../../shared/components/card/card';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

type Step = 1 | 2 | 3;

const DRAFT_CACHE_KEY = 'UrgentCreate_Draft';

interface UrgentCreateDraft {
  formValue: any;
  currentStep: Step;
  showForceCreatePopup: boolean;
  showDuplicateInfoDialog: boolean;
  currentDuplicateDecision: DuplicateDecision;
  isBlockedDuplicate: boolean;
  matchedCases: MatchedCaseResponse[];
  existingCaseType: CaseType | null;
  selectedLat: number | null;
  selectedLng: number | null;
  selectedAddress: string;
  isMapModalOpen: boolean;
}

@Component({
  selector: 'app-urgent-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MapLocationPickerComponent,
    ForceCreatePopupComponent,
    DuplicateInfoDialogComponent,
    ButtonComponent,
    FormField,
    ImageCropperComponent,
    CardComponent,
    HeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./urgent-create.css'],
  templateUrl: './urgent-create.html',
})
export class UrgentCreate implements OnInit {
  private fb = inject(FormBuilder);
  private imageService = inject(ImageService);
  private destroyRef = inject(DestroyRef);
  private cacheService = inject(CacheService);

  // Allowed datetime range for urgent cases (last 24 hours)
  readonly minEventDate = computed(() => {
    const now = new Date();
    const limitAgo = new Date(now.getTime() - URGENT_EVENT_MAX_AGE_HOURS * 60 * 60 * 1000);
    return toDatetimeLocalString(limitAgo);
  });

  readonly maxEventDate = computed(() => {
    const now = new Date();
    return toDatetimeLocalString(now);
  });
  private service = inject(UrgentCaseService);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);
  private geocoding = inject(GeocodingService);

  currentStep: Step = 1;
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  // خاصيات الـ Cropper والصورة الأساسية
  cropImageEvent = signal<Event | null>(null);
  croppedPrimaryImagePreview = signal<string | null>(null);
  tempCroppedBlob = signal<Blob | null>(null);
  primaryFile = signal<File | null>(null);
  primaryPhotoError = signal<string | null>(null);

  // الصور الإضافية والفيديو
  additionalPhotos = signal<File[]>([]);
  additionalPhotoPreviews = signal<string[]>([]);
  additionalPhotosError = signal<string | null>(null);
  videoFile = signal<File | null>(null);
  videoError = signal<string | null>(null);

  selectedLat = signal<number | null>(null);
  selectedLng = signal<number | null>(null);
  selectedAddress = signal<string>('');
  externalLocation = signal<{ lat: number; lng: number } | null>(null);
  isMapModalOpen = signal(false);

  isLocating = signal(false);
  locationError = signal<string | null>(null);

  showForceCreatePopup = signal(false);
  showDuplicateInfoDialog = signal(false);
  currentDuplicateDecision = signal<DuplicateDecision>(DuplicateDecision.None);
  isBlockedDuplicate = signal(false);
  matchedCases = signal<MatchedCaseResponse[]>([]);
  existingCaseType = signal<CaseType | null>(null);
  private pendingRequest: UrgentCaseCreateRequest | null = null;

  readonly genders = Gender;
  readonly relationOptions = RELATION_TYPE_OPTIONS;
  readonly caseTypes = CaseType;
  readonly governorates = EGYPT_GOVERNORATES;
  readonly today = new Date().toISOString().split('T')[0];

  readonly steps = [
    { num: 1, label: 'بيانات الشخص' },
    { num: 2, label: 'موقع الحادث' },
    { num: 3, label: 'صور' },
  ];

  get stepTitle(): string {
    return ['بيانات الشخص المفقود', 'موقع الحادث على الخريطة', 'صور'][this.currentStep - 1];
  }

  // ─────────────────────────────────────────────────────────────
  // Form definition — validators match backend exactly
  // ─────────────────────────────────────────────────────────────
  form = this.fb.group({
    // Name — required, Arabic only, 2-60 chars
    fName: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    // Optional name parts — Arabic only when provided, max 60
    sName: ['', [arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    tName: ['', [arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    lName: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    // Age — required, 1-120 (0 is not a valid age)
    age: [null as number | null, [Validators.required, Validators.min(1), Validators.max(120)]],
    // Gender — required, valid enum
    gender: ['' as Gender | '', [Validators.required, validEnum(Gender)]],
    // Relation — required, valid enum (Urgent Create only)
    relation: [null as RelationType | null, [Validators.required, validEnum(RelationType)]],
    // Phone — optional, Egyptian format, max 15
    communicationPhone: ['', [egyptianPhone(), Validators.maxLength(15)]],
    // Description — optional, max 2000
    description: ['', [Validators.maxLength(2000)]],
    // Location — required, valid governorate, 2-100 chars
    government: ['', [Validators.required, validGovernorate(), Validators.minLength(2), Validators.maxLength(100)]],
    city: ['', [Validators.required]],
    // Street — required, NOT Arabic-only, max 200
    street: ['', [Validators.required, Validators.maxLength(200)]],
    // EventDate — required, within last 24 hours
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

  onLocationChange(loc: { lat: number; lng: number; address: string }): void {
    this.selectedLat.set(loc.lat);
    this.selectedLng.set(loc.lng);
    this.selectedAddress.set(loc.address);
  }

  availableCities = signal<string[]>([]);

  constructor() {
    this.destroyRef.onDestroy(() => {
      // Only cache if we didn't just submit successfully
      if (this.form.dirty || this.currentStep > 1 || this.matchedCases().length > 0) {
        const draft: UrgentCreateDraft = {
          formValue: this.form.getRawValue(),
          currentStep: this.currentStep,
          showForceCreatePopup: this.showForceCreatePopup(),
          showDuplicateInfoDialog: this.showDuplicateInfoDialog(),
          currentDuplicateDecision: this.currentDuplicateDecision(),
          isBlockedDuplicate: this.isBlockedDuplicate(),
          matchedCases: this.matchedCases(),
          existingCaseType: this.existingCaseType(),
          selectedLat: this.selectedLat(),
          selectedLng: this.selectedLng(),
          selectedAddress: this.selectedAddress(),
          isMapModalOpen: this.isMapModalOpen()
        };
        this.cacheService.set(DRAFT_CACHE_KEY, draft, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);
      }
    });
  }

  ngOnInit(): void {
    // Set city validator here (after form is initialized) to avoid circular reference
    this.form.get('city')?.setValidators([Validators.required, validCity(() => this.form.get('government')?.value ?? null)]);
    this.form.get('city')?.updateValueAndValidity();

    this.form.get('government')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((gov) => {
        const cities = getCitiesForGovernorate(gov);
        this.availableCities.set(cities);
        const currentCity = this.form.get('city')?.value;
        if (currentCity && !cities.includes(currentCity)) {
          this.form.get('city')?.setValue('');
        }
        // Revalidate city whenever governorate changes
        this.form.get('city')?.updateValueAndValidity();
      });

    const draft = this.cacheService.get<UrgentCreateDraft>(DRAFT_CACHE_KEY);
    if (draft) {
      this.form.patchValue(draft.formValue);
      this.currentStep = draft.currentStep;
      this.showForceCreatePopup.set(draft.showForceCreatePopup);
      this.showDuplicateInfoDialog.set(draft.showDuplicateInfoDialog);
      this.currentDuplicateDecision.set(draft.currentDuplicateDecision);
      this.isBlockedDuplicate.set(draft.isBlockedDuplicate);
      this.matchedCases.set(draft.matchedCases);
      this.existingCaseType.set(draft.existingCaseType);
      
      this.selectedLat.set(draft.selectedLat);
      this.selectedLng.set(draft.selectedLng);
      this.selectedAddress.set(draft.selectedAddress);
      
      if (draft.selectedLat !== null && draft.selectedLng !== null) {
          this.externalLocation.set({ lat: draft.selectedLat, lng: draft.selectedLng });
      }

      this.isMapModalOpen.set(draft.isMapModalOpen || false);
      if (draft.showForceCreatePopup || draft.showDuplicateInfoDialog) {
        this.snackbar.info('تم استعادة بيانات النموذج. يرجى إعادة إرفاق الصور للمتابعة.');
      }
    }
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
    this.externalLocation.set({ lat: loc.lat, lng: loc.lng });
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
    const stepFields: Record<number, string[]> = {
      1: ['fName', 'lName', 'age', 'gender', 'relation', 'communicationPhone'],
      2: ['government', 'city', 'street', 'eventDate'],
    };
    const fields = stepFields[this.currentStep] ?? [];
    fields.forEach((f) => this.form.get(f)?.markAsTouched());
    if (fields.some((f) => this.form.get(f)?.invalid)) return;

    if (this.currentStep === 2) {
      if (this.selectedLat() === null || this.selectedLng() === null) {
        this.errorMsg.set('من فضلك حدد موقع الحادث على الخريطة.');
        return;
      }
    }

    this.currentStep = (this.currentStep + 1) as Step;
    this.errorMsg.set(null);
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep = (this.currentStep - 1) as Step;
  }

  // ─────────────────────────────────────────────────────────────
  // Primary photo & Cropper
  // ─────────────────────────────────────────────────────────────
  onPrimaryPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validation = this.imageService.validate(file, 5);
    if (!validation.valid) {
      this.primaryPhotoError.set(validation.errorMessage ?? null);
      return;
    }

    this.primaryPhotoError.set(null);
    this.cropImageEvent.set(event);
  }

  onImageCropped(event: ImageCroppedEvent): void {
    if (event.blob) {
      this.tempCroppedBlob.set(event.blob);
    }
  }

  confirmCrop(): void {
    const blob = this.tempCroppedBlob();
    if (!blob) return;

    const croppedFile = new File([blob], 'primary_image.jpg', { type: 'image/jpeg' });
    this.primaryFile.set(croppedFile);
    this.croppedPrimaryImagePreview.set(URL.createObjectURL(croppedFile));
    this.cropImageEvent.set(null);
  }

  cancelCrop(): void {
    this.cropImageEvent.set(null);
  }

  reCropPhoto(): void {
    this.croppedPrimaryImagePreview.set(null);
    this.cropImageEvent.set(null);
    this.primaryFile.set(null);
  }

  // ─────────────────────────────────────────────────────────────
  // Additional photos — max 4, JPG/JPEG/PNG/WebP, max 5 MB each
  // ─────────────────────────────────────────────────────────────
  onAdditionalPhotosSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    for (const f of files) {
      const validation = this.imageService.validate(f, 5);
      if (!validation.valid) {
        this.additionalPhotosError.set(validation.errorMessage ?? null);
        return;
      }
    }
    this.additionalPhotosError.set(null);
    this.additionalPhotos.update((p) => [...p, ...files].slice(0, 4));
    this.additionalPhotoPreviews.set(this.additionalPhotos().map((f) => URL.createObjectURL(f)));
  }

  removeAdditionalPhoto(index: number): void {
    this.additionalPhotos.update((p) => p.filter((_, i) => i !== index));
    this.additionalPhotoPreviews.update((p) => p.filter((_, i) => i !== index));
  }

 onVideoSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;

  if (!file) {
    this.videoFile.set(null);
    return;
  }

  const validation = validateVideoFile(file, 50);

  if (!validation.valid) {
    this.videoFile.set(null);
    this.videoError.set(validation.errorMessage ?? 'الملف غير صالح.');

    // مهم عشان لو اختار نفس الملف تاني بعد الرفض
    input.value = '';

    return;
  }

  this.videoError.set(null);
  this.videoFile.set(file);
}

  // ─────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────
  onSubmit(forceCreate = false): void {
    if (this.isSubmitting()) return;
    const primary = this.primaryFile();

    if (forceCreate && !this.pendingRequest && !primary) {
      this.errorMsg.set('يرجى إعادة إرفاق الصورة الأساسية قبل المتابعة.');
      this.showForceCreatePopup.set(false);
      this.showDuplicateInfoDialog.set(false);
      return;
    }

    if (
      !forceCreate &&
      (this.form.invalid || !primary || this.selectedLat() === null)
    ) {
      this.form.markAllAsTouched();
      if (!primary) {
        this.errorMsg.set('برجاء إضافة الصورة الأساسية للشخص وتحديد الوجه.');
      } else if (this.selectedLat() === null) {
        this.errorMsg.set('من فضلك حدد موقع الحادث على الخريطة.');
      }
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set(null);

    let request: UrgentCaseCreateRequest;
    if (forceCreate && this.pendingRequest) {
      request = this.pendingRequest;
    } else {
      const v = this.form.getRawValue();

      const formattedDate = v.eventDate ? new Date(v.eventDate).toISOString() : new Date().toISOString();

      request = {
        fName: v.fName!,
        lName: v.lName!,
        sName: v.sName || '',
        tName: v.tName || '',
        gender: v.gender as Gender,
        age: Number(v.age!),
        relation: v.relation!,
        communicationPhone: v.communicationPhone!,
        description: v.description || '',
        government: v.government!,
        city: v.city!,
        street: v.street!,
        eventDate: formattedDate,
        primaryImage: primary!,
        additionalImages: this.additionalPhotos().length ? this.additionalPhotos() : [],
        video: this.videoFile(),
        latitude: Number(this.selectedLat()!),
        longitude: Number(this.selectedLng()!),
      };
      this.pendingRequest = request;
    }

    this.service
      .createCase(request, forceCreate)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          const data = res.data;

          if (data && !data.isCreated) {
            this.currentDuplicateDecision.set(data.duplicateDecision);
            this.isBlockedDuplicate.set(data.isBlocked);
            this.matchedCases.set(data.matchedCases ?? []);
            this.existingCaseType.set(data.existingCaseType ?? null);

            if (data.duplicateDecision === DuplicateDecision.SameUserDuplicate || 
                data.duplicateDecision === DuplicateDecision.PendingOwnerCase ||
                data.duplicateDecision === DuplicateDecision.PendingUnknownCase) {
              this.showDuplicateInfoDialog.set(true);
            } else if (data.duplicateDecision === DuplicateDecision.ActiveOwnerCase ||
                       data.duplicateDecision === DuplicateDecision.ActiveUnknownCase) {
              this.showForceCreatePopup.set(true);
            }
            return;
          }

          this.cacheService.remove(DRAFT_CACHE_KEY);
          this.showForceCreatePopup.set(false);
          this.showDuplicateInfoDialog.set(false);
          this.snackbar.success('تم إنشاء الحالة بنجاح.');
          this.router.navigate(['/urgent']);
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          const msg = extractErrorMessage(err, 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.');
          
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

  onForceCreateCancel(): void {
    this.showForceCreatePopup.set(false);
  }

  onForceCreateConfirm(): void {
    if (this.isBlockedDuplicate()) {
      return;
    }
    this.showForceCreatePopup.set(false);
    this.onSubmit(true);
  }

  onPendingDialogClose(): void {
    this.showDuplicateInfoDialog.set(false);
  }

  onPendingDialogContinueCreate(): void {
    if (this.isBlockedDuplicate()) {
      return;
    }
    this.showDuplicateInfoDialog.set(false);
    this.onSubmit(true);
  }

  goBack(): void {
    this.router.navigate(['/urgent']);
  }
}
