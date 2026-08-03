import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { extractErrorMessage } from '../../../../shared/helper/case-error.helper';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';

import { LongTermCaseService } from '../../services/long-term-case.service';
import { LongTermCaseCreateRequest } from '../../models/request/LongTermCaseCreateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { CaseType } from '../../../../shared/enums/case-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/relation.type.dictionary';
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from '../../../../core/constants/governorates';
import { getFormFieldError, isFieldInvalid } from '../../../../shared/helper/form-validation.helper';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ForceCreatePopupComponent } from '../../../../shared/components/cases-components/force-create-popup/force-create-popup.component';
import { MatchedCaseResponse } from '../../../../core/models/cases.model';
import { DuplicateDecision } from '../../../../shared/enums/duplicate-decision';
import { DuplicateInfoDialogComponent } from '../../../../shared/components/cases-components/duplicate-info-dialog/duplicate-info-dialog.component';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { CardComponent } from '../../../../shared/components/card/card';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';

// Shared validators
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { ImageService } from '../../../../shared/services/image.service';

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-long-term-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ForceCreatePopupComponent,
    DuplicateInfoDialogComponent,
    ButtonComponent,
    FormField,
    ImageCropperComponent,
    CardComponent,
    CaseHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./long-term-create.css'],
  templateUrl: './long-term-create.html',
})
export class LongTermCreate {
  private fb = inject(FormBuilder);
  private imageService = inject(ImageService);
  private service = inject(LongTermCaseService);
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
  primaryPhotoFile = signal<File | null>(null);
  primaryPhotoError = signal<string | null>(null);

  // Additional photos
  additionalPhotos = signal<File[]>([]);
  additionalPhotoPreviews = signal<string[]>([]);
  additionalPhotosError = signal<string | null>(null);

  // Police report (optional — JPG/JPEG/PNG/WebP, max 10 MB)
  policeReportFile = signal<File | null>(null);
  policeReportError = signal<string | null>(null);

  videoFile = signal<File | null>(null);

  showForceCreatePopup = signal(false);
  showDuplicateInfoDialog = signal(false);
  currentDuplicateDecision = signal<DuplicateDecision>(DuplicateDecision.None);
  isBlockedDuplicate = signal(false);
  matchedCases = signal<MatchedCaseResponse[]>([]);
  existingCaseType = signal<CaseType | null>(null);
  private pendingRequest: LongTermCaseCreateRequest | null = null;

  readonly genders = Gender;
  readonly relationOptions = RELATION_TYPE_OPTIONS;
  readonly caseTypes = CaseType;
  readonly governorates = EGYPT_GOVERNORATES;
  readonly today = new Date().toISOString().split('T')[0];

  readonly steps = [
    { num: 1, label: 'بيانات الشخص' },
    { num: 2, label: 'موقع الاختفاء' },
    { num: 3, label: 'مستندات وصور' },
  ];

  get stepTitle(): string {
    return ['بيانات الشخص المفقود', 'آخر موقع معروف', 'مستندات وصور'][this.currentStep - 1];
  }

  // ─────────────────────────────────────────────────────────────
  // Form definition — validators match backend exactly
  // ─────────────────────────────────────────────────────────────
  form = this.fb.group({
    fName: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    sName: ['', [arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    tName: ['', [arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    lName: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(120)]],
    gender: ['' as Gender | '', [Validators.required, validEnum(Gender)]],
    relation: [null as RelationType | null, [Validators.required, validEnum(RelationType)]],
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
      1: ['fName', 'lName', 'age', 'gender', 'relation'],
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
  // ─────────────────────────────────────────────────────────────
  // Primary photo with Cropper
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
    this.primaryPhotoFile.set(croppedFile);
    this.croppedPrimaryImagePreview.set(URL.createObjectURL(croppedFile));
    this.cropImageEvent.set(null);
    this.errorMsg.set(null);
  }

  cancelCrop(): void {
    this.cropImageEvent.set(null);
  }

  reCropPhoto(): void {
    this.croppedPrimaryImagePreview.set(null);
    this.cropImageEvent.set(null);
    this.primaryPhotoFile.set(null);
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
    this.refreshAdditionalPreviews();
  }

  private refreshAdditionalPreviews(): void {
    this.additionalPhotoPreviews.set(this.additionalPhotos().map((f) => URL.createObjectURL(f)));
  }

  removeAdditionalPhoto(index: number): void {
    this.additionalPhotos.update((p) => p.filter((_, i) => i !== index));
    this.refreshAdditionalPreviews();
  }

  // ─────────────────────────────────────────────────────────────
  // Police report — optional, JPG/JPEG/PNG/WebP, max 10 MB
  // ─────────────────────────────────────────────────────────────
  onPoliceReportSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;

    const validation = this.imageService.validate(file, 10);
    if (!validation.valid) {
      this.policeReportError.set(validation.errorMessage ?? null);
      return;
    }

    this.policeReportError.set(null);
    this.policeReportFile.set(file);
  }

  onVideoSelected(event: Event): void {
    this.videoFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  // ─────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────
  onSubmit(forceCreate = false): void {
    if (this.isSubmitting()) return;
    const primaryImg = this.primaryPhotoFile();

    if (!forceCreate && (this.form.invalid || !primaryImg)) {
      this.form.markAllAsTouched();
      if (!primaryImg) {
        this.errorMsg.set('برجاء إضافة الصورة الأساسية للشخص وتحديد الوجه.');
      }
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set(null);

    let request: LongTermCaseCreateRequest;
    if (forceCreate && this.pendingRequest) {
      request = this.pendingRequest;
    } else {
      const v = this.form.getRawValue();

      request = {
        fName: v.fName!,
        lName: v.lName!,
        sName: v.sName || null,
        tName: v.tName || null,
        gender: v.gender as Gender,
        age: v.age!,
        relation: v.relation!,
        communicationPhone: v.communicationPhone || null,
        description: v.description || null,
        government: v.government!,
        city: v.city!,
        street: v.street!,
        eventDate: v.eventDate!,
        primaryImage: primaryImg!,
        additionalImages: this.additionalPhotos().length ? this.additionalPhotos() : null,
        video: this.videoFile(),
        policeReportImage: this.policeReportFile(),
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

          this.showForceCreatePopup.set(false);
          this.showDuplicateInfoDialog.set(false);
          this.snackbar.success('تم إرسال البلاغ بنجاح، هيتم مراجعته من الإدارة قريبًا.');
          this.router.navigate(['/long-term']);
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          const msg = extractErrorMessage(err, 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.');
          
          if (err && typeof err === 'object' && 'status' in err && (err as any).status === 400) {
            if (msg.includes('يجب أن تكون لنفس الشخص') || msg.includes('لا تبدو لنفس الشخص')) {
               this.additionalPhotosError.set(msg);
               return;
            }

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
    this.router.navigate(['/long-term']);
  }
}
