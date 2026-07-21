import { FormField } from '../../../../shared/components/form-field/form-field';
import { CardComponent } from '../../../../shared/components/card/card';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { UnknownCaseService } from '../../services/unknown-case.service';
import { UnknownCaseCreateRequest } from '../../models/request/UnknownCaseCreateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { EGYPT_GOVERNORATES } from '../../../../core/constants/governorates';
import { SnackbarService } from '../../../../core/services/toast.service';
import { ForceCreatePopupComponent } from '../../../../shared/components/cases-components/force-create-popup/force-create-popup.component';
import { MatchedCaseDto, mapMatchedCaseResponseToDto } from '../../../../shared/models/responses/matched-case.model';

// Shared validators
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';

type Step = 1 | 2 | 3;

import { ButtonComponent } from '../../../../shared/components/button/button';
@Component({
  selector: 'app-unknown-create',
  standalone: true,
  imports: [ReactiveFormsModule, ForceCreatePopupComponent, ImageCropperComponent,
    CardComponent,
    FormField,
    ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../../../../shared/styles/case-form.css', './unknown-create.css'],
  templateUrl: './unknown-create.html',
})
export class UnknownCreate {
  private fb = inject(FormBuilder);
  private service = inject(UnknownCaseService);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);

  currentStep: Step = 1;
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  // Cropper & primary photo
  cropImageEvent = signal<any>(null);
  croppedPrimaryImagePreview = signal<string | null>(null);
  tempCroppedBlob = signal<Blob | null>(null);
  primaryFile = signal<File | null>(null);
  primaryPhotoError = signal<string | null>(null);

  // Additional photos
  additionalPhotos = signal<File[]>([]);
  additionalPhotoPreviews = signal<string[]>([]);
  additionalPhotosError = signal<string | null>(null);

  videoFile = signal<File | null>(null);

  showForceCreatePopup = signal(false);
  matchedCases = signal<MatchedCaseDto[]>([]);
  private pendingRequest: UnknownCaseCreateRequest | null = null;

  readonly genders = Gender;
  readonly governorates = EGYPT_GOVERNORATES;
  readonly today = new Date().toISOString().split('T')[0];

  readonly steps = [
    { num: 1, label: 'بيانات الشخص' },
    { num: 2, label: 'موقع العثور عليه' },
    { num: 3, label: 'صور' },
  ];

  get stepTitle(): string {
    return ['بيانات الشخص (إن وُجدت)', 'موقع العثور عليه', 'صور'][this.currentStep - 1];
  }

  // ─────────────────────────────────────────────────────────────
  // Form definition — validators match backend exactly (UnknownCase)
  // ─────────────────────────────────────────────────────────────
  form = this.fb.group({
    // Optional — Arabic only when provided, 2-60 chars
    fName: ['', [arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    sName: ['', [arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    tName: ['', [arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    lName: ['', [arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    // Age — required, 0-120
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(120)]],
    // Gender — required, valid enum
    gender: ['' as Gender | '', [Validators.required, validEnum(Gender)]],
    // Phone — optional, Egyptian format, max 15
    communicationPhone: ['', [egyptianPhone(), Validators.maxLength(15)]],
    // Description — optional, max 2000
    description: ['', [Validators.maxLength(2000)]],
    // Location — required, Arabic only, 2-100
    government: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(100)]],
    city: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(100)]],
    // Street — required, NOT Arabic-only, max 200
    street: ['', [Validators.required, Validators.maxLength(200)]],
    // EventDate — required, cannot be future
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

  nextStep(): void {
    const stepFields: Record<number, string[]> = {
      1: ['age', 'gender'],
      2: ['government', 'city', 'street', 'eventDate'],
    };
    const fields = stepFields[this.currentStep] ?? [];
    fields.forEach((f) => this.form.get(f)?.markAsTouched());
    if (fields.some((f) => this.form.get(f)?.invalid)) return;
    this.currentStep = (this.currentStep + 1) as Step;
    this.errorMsg.set(null);
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep = (this.currentStep - 1) as Step;
  }

  // ─────────────────────────────────────────────────────────────
  // File validation constants
  // ─────────────────────────────────────────────────────────────
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  private readonly MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

  // Primary photo with Cropper — validate type/size first
  onPrimaryPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!this.ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      this.primaryPhotoError.set('نوع الملف غير مسموح. يُقبل فقط: JPEG, PNG, WebP');
      return;
    }
    if (file.size > this.MAX_PHOTO_BYTES) {
      this.primaryPhotoError.set('حجم الصورة يتجاوز الحد المسموح (5 MB)');
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

  // Additional photos — max 4, JPEG/PNG/WebP, max 5 MB each
  onAdditionalPhotosSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    const invalidType = files.find(f => !this.ALLOWED_TYPES.includes(f.type.toLowerCase()));
    if (invalidType) {
      this.additionalPhotosError.set('أحد الملفات من نوع غير مسموح. يُقبل فقط: JPEG, PNG, WebP');
      return;
    }
    const oversized = files.find(f => f.size > this.MAX_PHOTO_BYTES);
    if (oversized) {
      this.additionalPhotosError.set('أحد الملفات يتجاوز الحد المسموح (5 MB لكل صورة)');
      return;
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

  // --- إرسال النموذج ---
  onSubmit(forceCreate = false): void {
    const primary = this.primaryFile();

    if (!forceCreate && (this.form.invalid || !primary)) {
      this.form.markAllAsTouched();
      if (!primary) {
        this.errorMsg.set('برجاء إضافة وتأطير الصورة الأساسية.');
      }
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set(null);

    let request: UnknownCaseCreateRequest;
    if (forceCreate && this.pendingRequest) {
      request = this.pendingRequest;
    } else {
      const v = this.form.getRawValue();

      request = {
        fName: v.fName || null,
        lName: v.lName || null,
        sName: v.sName || null,
        tName: v.tName || null,
        gender: v.gender as Gender,
        age: v.age!,
        communicationPhone: v.communicationPhone || null,
        description: v.description || null,
        government: v.government!,
        city: v.city!,
        street: v.street!,
        eventDate: v.eventDate!,
        primaryImage: primary!,
        additionalImages: this.additionalPhotos().length ? this.additionalPhotos() : null,
        video: this.videoFile(),
      };
      this.pendingRequest = request;
    }

    this.service.createCase(request, forceCreate).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        const data = res.data;

        if (data && data.isCreated === false) {
          const rawData = data as any;

          if (rawData.isSameTypeDuplicate) {
            this.showForceCreatePopup.set(false);
            this.snackbar.success('تم إرسال البلاغ بنجاح، هيتم مراجعته من الإدارة قريبًا.');
            this.router.navigate(['/unknown']);
            return;
          }

          this.matchedCases.set((data.matchedCases ?? []).map(mapMatchedCaseResponseToDto));
          this.showForceCreatePopup.set(true);
          return;
        }

        this.showForceCreatePopup.set(false);
        this.snackbar.success('تم إرسال البلاغ بنجاح، هيتم مراجعته من الإدارة قريبًا.');
        this.router.navigate(['/unknown']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.';
        this.errorMsg.set(msg);
        this.snackbar.error(msg);
      },
    });
  }

  onForceCreateCancel(): void {
    this.showForceCreatePopup.set(false);
  }

  onForceCreateConfirm(): void {
    this.showForceCreatePopup.set(false);
    this.onSubmit(true);
  }

  goBack(): void {
    this.router.navigate(['/unknown']);
  }
}