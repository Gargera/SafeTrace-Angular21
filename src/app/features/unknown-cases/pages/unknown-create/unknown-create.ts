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

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-unknown-create',
  standalone: true,
  imports: [ReactiveFormsModule, ForceCreatePopupComponent, ImageCropperComponent],
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

  // خاصيات الـ Cropper والصورة الأساسية
  cropImageEvent = signal<any>(null);
  croppedPrimaryImagePreview = signal<string | null>(null);
  tempCroppedBlob = signal<Blob | null>(null);
  primaryFile = signal<File | null>(null);

  // الصور الإضافية والفيديو
  additionalPhotos = signal<File[]>([]);
  additionalPhotoPreviews = signal<string[]>([]);
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

  form = this.fb.group({
    fName: ['', [Validators.minLength(2), Validators.maxLength(100)]],
    sName: ['', [Validators.maxLength(100)]],
    tName: ['', [Validators.maxLength(100)]],
    lName: ['', [Validators.minLength(2), Validators.maxLength(100)]],
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(150)]],
    gender: ['' as Gender | '', Validators.required],
    communicationPhone: ['', [Validators.maxLength(20)]],
    description: ['', [Validators.maxLength(2000)]],
    government: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    street: ['', [Validators.required, Validators.maxLength(500)]],
    eventDate: ['', Validators.required],
  });

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
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

  // --- معالجة الصورة الأساسية والـ Cropper ---
  onPrimaryPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.cropImageEvent.set(event);
    }
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

  // --- معالجة الصور الإضافية ---
  onAdditionalPhotosSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
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