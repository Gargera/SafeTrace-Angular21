import { Component, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { extractErrorMessage } from '../../../../shared/helper/case-error.helper';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { UrgentCaseService } from '../../services/urgent-case.service';
import { UrgentCaseCreateRequest } from '../../models/request/UrgentCaseCreateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/relation.type.dictionary';
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from '../../../../core/constants/governorates';
import { getFormFieldError, isFieldInvalid } from '../../../../shared/helper/form-validation.helper';
import { MapLocationPickerComponent } from '../../../../shared/components/map-location-picker/components/map-location-picker';
import { SnackbarService } from '../../../../core/services/toast.service';
import { ForceCreatePopupComponent } from '../../../../shared/components/cases-components/force-create-popup/force-create-popup.component';
import { MatchedCaseResponse } from '../../../../core/models/Cases.model';
import { GeocodingService } from '../../../../core/services/geocoding/geocoding.service';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';

// Shared validators
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { urgentEventDate, toDatetimeLocalString } from '../../../../shared/validators/urgent-event-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { validateImageFile } from '../../../user-profile/tabs/Edit-profile/utilies/image-validation.util';

import { CardComponent } from '../../../../shared/components/card/card';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-urgent-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MapLocationPickerComponent,
    ForceCreatePopupComponent,
    ButtonComponent,
    FormField,
    ImageCropperComponent,
    CardComponent,
    CaseHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./urgent-create.css'],
  templateUrl: './urgent-create.html',
})
export class UrgentCreate {
  private fb = inject(FormBuilder);
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

  selectedLat = signal<number | null>(null);
  selectedLng = signal<number | null>(null);
  selectedAddress = signal<string>('');
  externalLocation = signal<{ lat: number; lng: number } | null>(null);
  isMapModalOpen = signal(false);

  isLocating = signal(false);
  locationError = signal<string | null>(null);

  showForceCreatePopup = signal(false);
  isBlockedDuplicate = signal(false);
  matchedCases = signal<MatchedCaseResponse[]>([]);
  private pendingRequest: UrgentCaseCreateRequest | null = null;

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
    // Age — required, 0-120
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(120)]],
    // Gender — required, valid enum
    gender: ['' as Gender | '', [Validators.required, validEnum(Gender)]],
    // Relation — required, valid enum (Urgent Create only)
    relation: [null as RelationType | null, [Validators.required, validEnum(RelationType)]],
    // Phone — optional, Egyptian format, max 15
    communicationPhone: ['', [egyptianPhone(), Validators.maxLength(15)]],
    // Description — optional, max 2000
    description: ['', [Validators.maxLength(2000)]],
    // Location — required, Arabic only, 2-100 chars
    government: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(100)]],
    city: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(100)]],
    // Street — required, NOT Arabic-only, max 200
    street: ['', [Validators.required, Validators.maxLength(200)]],
    // EventDate — required, recent (within 6 hours)
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

  ngOnInit(): void {
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

    const validation = validateImageFile(file, 5);
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
      const validation = validateImageFile(f, 5);
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
    this.videoFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  // ─────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────
  onSubmit(forceCreate = false): void {
    if (this.isSubmitting()) return;
    const primary = this.primaryFile();

    if (
      !forceCreate &&
      (this.form.invalid || !primary || this.selectedLat() === null)
    ) {
      this.form.markAllAsTouched();
      if (!primary) {
        this.errorMsg.set('برجاء إضافة وتأطير الصورة الأساسية للشخص.');
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

          // في حالة التكرار وعدم الإنشـاء
          if (data && (data.isCreated === false || data.isCreated === undefined)) {
            if (data.matchedCases) {
              this.matchedCases.set(data.matchedCases);
            } else {
              this.matchedCases.set([]);
            }

            const rawData = (data as unknown) as Record<string, unknown>;
            const isSameType = rawData['isSameTypeDuplicate'] ?? rawData['IsSameTypeDuplicate'] ?? false;

            this.isBlockedDuplicate.set(Boolean(isSameType));
            this.showForceCreatePopup.set(true);
            return;
          }

          this.showForceCreatePopup.set(false);
          this.snackbar.success('تم إرسال بلاغ الحالة بنجاح، هيتم مراجعته من الإدارة قريبًا.');
          this.router.navigate(['/urgent']);
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          const msg = extractErrorMessage(err, 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.');
          this.errorMsg.set(msg);
          this.snackbar.error(msg);
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

  goBack(): void {
    this.router.navigate(['/urgent']);
  }
}