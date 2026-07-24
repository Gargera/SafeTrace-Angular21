import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment'; 
import { UrgentCaseService } from '../../services/urgent-case.service';
import { UrgentCaseUpdateRequest } from '../../models/request/UrgentCaseUpdateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/relation.type.dictionary';
import { EGYPT_GOVERNORATES } from '../../../../core/constants/governorates';
import { MapLocationPickerComponent } from '../../../../shared/components/map-location-picker/components/map-location-picker';
import { SnackbarService } from '../../../../core/services/toast.service';
import { CaseFileResponse } from '../../../../shared/models/responses/case-file.model';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { CardComponent } from '../../../../shared/components/card/card';

// Shared validators
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';

import { CommonModule } from '@angular/common';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';

import { GeocodingService } from '../../../../core/services/geocoding/geocoding.service';

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
    CaseHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./urgent-update.css'],
  templateUrl: './urgent-update.html',
})
export class UrgentUpdate implements OnInit {
  private fb = inject(FormBuilder);
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
    eventDate: ['', [Validators.required, pastDate()]],
  });

  // ─────────────────────────────────────────────────────────────
  // Error message helper
  // ─────────────────────────────────────────────────────────────
  getFieldError(field: string): string | null {
    const control = this.form.get(field);
    if (!control || !control.errors || !(control.touched || control.dirty)) return null;
    const e = control.errors;
    if (e['required']) return 'هذا الحقل مطلوب';
    if (e['arabicText']) return 'يجب كتابة النص بالحروف العربية فقط';
    if (e['minlength']) return `الحد الأدنى ${e['minlength'].requiredLength} أحرف`;
    if (e['maxlength']) return `الحد الأقصى ${e['maxlength'].requiredLength} حرفاً`;
    if (e['min']) return `يجب أن لا تقل القيمة عن ${e['min'].min}`;
    if (e['max']) return `يجب أن لا تتجاوز القيمة ${e['max'].max}`;
    if (e['egyptianPhone']) return 'أدخل رقم هاتف مصري صحيح (مثال: 01xxxxxxxxx)';
    if (e['pastDate']) return 'لا يمكن أن يكون التاريخ في المستقبل';
    if (e['description']) return 'لا يمكن أن يتجاوز الوصف 2000 حرف';
    if (e['validEnum']) return 'اختر قيمة صحيحة';
    return 'قيمة غير صحيحة';
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && (c?.touched || c?.dirty));
  }

  ngOnInit(): void {
    this.caseId = Number(this.route.snapshot.paramMap.get('id'));
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
    this.service.getCaseById(this.caseId).subscribe({
      next: (res) => {
        const c = res.data as any; // adjust to your exact UrgentCaseDetailResponse shape
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
          eventDate: c.eventDate ? String(c.eventDate).split('T')[0] : '',
        });

        if (c.latitude != null && c.longitude != null) {
          this.selectedLat.set(c.latitude);
          this.selectedLng.set(c.longitude);
          this.initialMapCenter.set({ lat: c.latitude, lng: c.longitude });
          this.geocoding.reverseGeocode(c.latitude, c.longitude).subscribe({
            next: (addr) => this.selectedAddress.set(addr),
            error: () => this.selectedAddress.set(`${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`),
          });
        }

        // FIX: backend's CaseDetailBaseDto exposes the property as "Photos"
        // (camelCase JSON: "photos"), NOT "files"/"caseFiles".
        const rawFiles: CaseFileResponse[] = c.photos ?? c.files ?? c.caseFiles ?? [];
        const files: CaseFileResponse[] = rawFiles.map((f) => ({
          ...f,
          imagePath: this.resolveMediaUrl(f.imagePath) ?? f.imagePath,
        }));
        this.existingPhotos.set(files);
        this.primaryPhotoId.set(files.find((f) => f.isPrimary)?.id ?? null);
        this.existingVideoUrl.set(this.resolveMediaUrl(c.video ?? c.videoPath ?? null));

        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'تعذر تحميل بيانات الحالة.');
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

        this.geocoding.reverseGeocode(lat, lng).subscribe({
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
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  private readonly MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

  removeExistingPhoto(photo: CaseFileResponse): void {
    this.existingPhotos.update((list) => list.filter((p) => p.id !== photo.id));
    this.deletedPhotoIds.update((ids) => [...ids, photo.id]);
    if (this.primaryPhotoId() === photo.id) {
      const next = this.existingPhotos()[0];
      this.primaryPhotoId.set(next ? next.id : null);
    }
  }

  setExistingAsPrimary(photo: CaseFileResponse): void {
    this.primaryPhotoId.set(photo.id);
    this.newPrimaryImage.set(null);
    this.newPrimaryPreview.set(null);
  }

  onNewPrimarySelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    if (!this.ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      this.newPrimaryError.set('نوع الملف غير مسموح. يُقبل فقط: JPEG, PNG, WebP');
      return;
    }
    if (file.size > this.MAX_PHOTO_BYTES) {
      this.newPrimaryError.set('حجم الصورة يتجاوز الحد المسموح (5 MB)');
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
    const invalidType = files.find(f => !this.ALLOWED_TYPES.includes(f.type.toLowerCase()));
    if (invalidType) {
      this.newPhotosError.set('أحد الملفات من نوع غير مسموح. يُقبل فقط: JPEG, PNG, WebP');
      return;
    }
    const oversized = files.find(f => f.size > this.MAX_PHOTO_BYTES);
    if (oversized) {
      this.newPhotosError.set('أحد الملفات يتجاوز الحد المسموح (5 MB لكل صورة)');
      return;
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
    this.videoFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  onSubmit(): void {
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
      relation: v.relation ?? undefined,
      communicationPhone: v.communicationPhone || null,
      description: v.description || null,
      government: v.government!,
      city: v.city!,
      street: v.street!,
      eventDate: v.eventDate!,
      primaryImage: this.newPrimaryImage(),
      newPhotos: this.newPhotos().length ? this.newPhotos() : null,
      deletedPhotoIds: this.deletedPhotoIds().length ? this.deletedPhotoIds() : null,
      primaryPhotoId: this.primaryPhotoId(),
      video: this.videoFile(),
      latitude: this.selectedLat()!,
      longitude: this.selectedLng()!,
    };

    this.service.updateCase(this.caseId, request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.snackbar.success('تم تحديث بيانات الحالة بنجاح.');
        this.router.navigate(['/urgent', this.caseId]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء حفظ التعديلات. حاول مرة أخرى.';
        this.errorMsg.set(msg);
        this.snackbar.error(msg);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/urgent', this.caseId]);
  }
}