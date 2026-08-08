import { Component, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { UnknownCaseService } from '../../services/unknown-case.service';
import { UnknownCaseUpdateRequest } from '../../models/request/UnknownCaseUpdateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from '../../../../core/constants/governorates';
import { getFormFieldError, isFieldInvalid } from '../../../../shared/helper/form-validation.helper';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { CaseFileResponse } from '../../../../core/models/cases.model';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { CardComponent } from '../../../../shared/components/card/card';

// Shared validators
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { ImageService } from '../../../../shared/services/image.service';

import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-unknown-update',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    FormField,
    CardComponent,
    HeaderComponent,
    ConfirmationModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./unknown-update.css'],
  templateUrl: './unknown-update.html',
})
export class UnknownUpdate implements OnInit {
  private fb = inject(FormBuilder);
  private imageService = inject(ImageService);
  private service = inject(UnknownCaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackbar = inject(SnackbarService);
  private destroyRef = inject(DestroyRef);

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
  // Form definition — validators match backend exactly (UnknownCase Update)
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
   * (e.g. "/Images/UnknownCase/xxx.jpg"). Without prefixing environment.baseUrl,
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
            communicationPhone: c.communicationPhone ?? '',
            description: c.description ?? '',
            government: c.government ?? '',
            city: c.city ?? '',
            street: c.street ?? '',
            eventDate: c.eventDate ? String(c.eventDate).split('T')[0] : '',
          });

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

  confirmRemoveExistingPhoto(photo: CaseFileResponse): void {
    this.photoToDelete.set(photo);
    this.showDeleteImageConfirm.set(true);
  }

  executeRemoveExistingPhoto(): void {
    const photo = this.photoToDelete();
    if (photo) {
      this.existingPhotos.update((list) => list.filter((p) => p.id !== photo.id));
      this.deletedPhotoIds.update((ids) => [...ids, photo.id]);
      if (this.primaryPhotoId() === photo.id) {
        const next = this.existingPhotos()[0];
        this.primaryPhotoId.set(next ? next.id : null);
      }
    }
    this.showDeleteImageConfirm.set(false);
    this.photoToDelete.set(null);
  }

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
    this.videoFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid || (this.existingPhotos().length === 0 && !this.newPrimaryImage() && this.newPhotos().length === 0)) {
      this.form.markAllAsTouched();
      if (this.existingPhotos().length === 0 && !this.newPrimaryImage() && this.newPhotos().length === 0) {
        this.errorMsg.set('لازم يفضل في صورة واحدة على الأقل للحالة.');
      }
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set(null);

    const v = this.form.getRawValue();

    const request: UnknownCaseUpdateRequest = {
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
      primaryImage: this.newPrimaryImage(),
      newPhotos: this.newPhotos().length ? this.newPhotos() : null,
      deletedPhotoIds: this.deletedPhotoIds().length ? this.deletedPhotoIds() : null,
      primaryPhotoId: this.primaryPhotoId(),
      video: this.videoFile(),
    };

    this.service
      .updateCase(this.caseId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.snackbar.success('تم تحديث بيانات الحالة بنجاح.');
          this.router.navigate(['/unknown']);
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
    this.router.navigate(['/unknown']);
  }
}
