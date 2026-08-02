import { FormField } from '../../../../shared/components/form-field/form-field';
import { CardComponent } from '../../../../shared/components/card/card';
import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { extractErrorMessage } from '../../../../shared/helper/case-error.helper';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { UnknownCaseService } from '../../services/unknown-case.service';
import { UnknownCaseCreateRequest } from '../../models/request/UnknownCaseCreateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from '../../../../core/constants/governorates';
import { getFormFieldError, isFieldInvalid } from '../../../../shared/helper/form-validation.helper';
import { SnackbarService } from '../../../../core/services/toast.service';
import { ForceCreatePopupComponent } from '../../../../shared/components/cases-components/force-create-popup/force-create-popup.component';
import { MatchedCaseResponse } from '../../../../core/models/cases.model';
import { DuplicateDecision } from '../../../../shared/enums/duplicate-decision';
import { DuplicateInfoDialogComponent } from '../../../../shared/components/cases-components/duplicate-info-dialog/duplicate-info-dialog.component';

// Shared validators
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { validateImageFile } from '../../../user-profile/tabs/Edit-profile/utilies/image-validation.util';

type Step = 1 | 2 | 3;

import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';

@Component({
  selector: 'app-unknown-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ForceCreatePopupComponent,
    DuplicateInfoDialogComponent,
    ImageCropperComponent,
    CardComponent,
    FormField,
    ButtonComponent,
    CaseHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./unknown-create.css'],
  templateUrl: './unknown-create.html',
})
export class UnknownCreate {
  private fb = inject(FormBuilder);
  private service = inject(UnknownCaseService);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);
  private destroyRef = inject(DestroyRef);

  currentStep: Step = 1;
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  // Cropper & primary photo
  cropImageEvent = signal<Event | null>(null);
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
  showDuplicateInfoDialog = signal(false);
  currentDuplicateDecision = signal<DuplicateDecision>(DuplicateDecision.None);
  isBlockedDuplicate = signal(false);
  matchedCases = signal<MatchedCaseResponse[]>([]);
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
    return getFormFieldError(this.form, field);
  }

  isInvalid(field: string): boolean {
    return isFieldInvalid(this.form, field);
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

  // Primary photo with Cropper — validate type/size first
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

  // Additional photos — max 4, JPG/JPEG/PNG/WebP, max 5 MB each
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

  // --- إرسال النموذج ---
  onSubmit(forceCreate = false): void {
    if (this.isSubmitting()) return;
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

    this.service
      .createCase(request, forceCreate)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          const data = res.data;

          if (data && !data.isCreated) {
            this.currentDuplicateDecision.set(data.duplicateDecision);

            if (data.duplicateDecision === DuplicateDecision.SameUserPending || 
                data.duplicateDecision === DuplicateDecision.SameUserActive ||
                data.duplicateDecision === DuplicateDecision.PendingDuplicate) {
              this.showDuplicateInfoDialog.set(true);
            } else {
              // ApprovedDuplicate or AllowUnknown
              this.matchedCases.set(data.matchedCases ?? []);
              this.isBlockedDuplicate.set(data.isBlocked);
              this.showForceCreatePopup.set(true);
            }
            return;
          }

          this.showForceCreatePopup.set(false);
          this.showDuplicateInfoDialog.set(false);
          this.snackbar.success('تم إرسال البلاغ بنجاح، هيتم مراجعته من الإدارة قريبًا.');
          this.router.navigate(['/unknown']);
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

  /** Unknown + Unknown: attach new case to the existing duplicate group */
  onJoinGroupConfirm(): void {
    if (this.isBlockedDuplicate()) {
      return;
    }
    this.showForceCreatePopup.set(false);
    this.onSubmit(true);
  }

  onPendingDialogClose() {
    this.showDuplicateInfoDialog.set(false);
  }

  goBack(): void {
    this.router.navigate(['/unknown']);
  }
}