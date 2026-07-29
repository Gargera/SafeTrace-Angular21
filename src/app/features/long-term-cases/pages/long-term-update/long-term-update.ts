import { Component, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { extractErrorMessage } from '../../../../shared/helper/case-error.helper';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';

import { environment } from '../../../../../environments/environment';
import { LongTermCaseService } from '../../services/long-term-case.service';
import { LongTermCaseUpdateRequest } from '../../models/request/LongTermCaseUpdateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/relation.type.dictionary';
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from '../../../../core/constants/governorates';
import { getFormFieldError, isFieldInvalid } from '../../../../shared/helper/form-validation.helper';
import { SnackbarService } from '../../../../core/services/toast.service';
import { CaseFileResponse } from '../../../../shared/models/responses/case-file.model';

import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { CardComponent } from '../../../../shared/components/card/card';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';

// Shared validators
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { validateImageFile } from '../../../user-profile/tabs/Edit-profile/utilies/image-validation.util';

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-long-term-update',
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    ImageCropperComponent,
    ButtonComponent,
    FormField,
    CardComponent,
    CaseHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./long-term-update.css'],
  templateUrl: './long-term-update.html',
})
export class LongTermUpdate implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(LongTermCaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackbar = inject(SnackbarService);
  private destroyRef = inject(DestroyRef);

  caseId!: number;
  currentStep: Step = 1;
  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  // Existing photos
  existingPhotos = signal<CaseFileResponse[]>([]);
  deletedPhotoIds = signal<number[]>([]);
  primaryPhotoId = signal<number | null>(null);

  // Inline Cropper & New Primary photo state (Matching Create structure)
  cropImageEvent = signal<Event | null>(null);
  tempCroppedBlob = signal<Blob | null>(null);
  newPrimaryImage = signal<File | null>(null);
  newPrimaryPreview = signal<string | null>(null);
  newPrimaryError = signal<string | null>(null);

  // Tracks whether the cropper is currently editing an EXISTING photo
  // (vs. cropping a brand-new upload). null = new upload flow.
  cropTargetExistingId = signal<number | null>(null);
  existingPhotoEditError = signal<string | null>(null);

  // New Additional photos
  newPhotos = signal<File[]>([]);
  newPhotoPreviews = signal<string[]>([]);
  newPhotosError = signal<string | null>(null);

  // Documents and Media
  existingPoliceReportUrl = signal<string | null>(null);
  policeReportFile = signal<File | null>(null);
  policeReportError = signal<string | null>(null);

  existingVideoUrl = signal<string | null>(null);
  videoFile = signal<File | null>(null);

  readonly genders = Gender;
  readonly relationOptions = RELATION_TYPE_OPTIONS;
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
  // Form definition
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
  // Error message helpers
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

  private loadCase(): void {
    this.isLoading.set(true);
    this.service
      .getCaseById(this.caseId)
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
            eventDate: c.eventDate ? String(c.eventDate).split('T')[0] : '',
          });

          const rawFiles: CaseFileResponse[] = c.photos ?? [];
          const files: CaseFileResponse[] = rawFiles.map((f) => ({
            ...f,
            imagePath: this.resolveMediaUrl(f.imagePath) ?? f.imagePath,
          }));
          this.existingPhotos.set(files);

          const primary = files.find((f) => f.isPrimary);
          this.primaryPhotoId.set(primary ? primary.id : (files[0]?.id ?? null));

          this.existingPoliceReportUrl.set(this.resolveMediaUrl(c.policeReportImage ?? null));
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



  /**
   * The backend (local FileStorageService) returns RELATIVE paths only
   * (e.g. "/Images/LongTermCase/xxx.jpg"), with no host attached.
   * Without prefixing environment.baseUrl, <img src> resolves against the
   * Angular app's own origin (localhost:4200) instead of the API
   * (localhost:7041) — which is exactly why photos looked broken/missing
   * even though the files physically exist on the API server.
   *
   * Kept forward-compatible: if the backend ever returns an absolute URL
   * (e.g. after migrating to S3), it's passed through untouched.
   */
  private resolveMediaUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${environment.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  // ─────────────────────────────────────────────────────────────
  // Existing Photos Handler
  // ─────────────────────────────────────────────────────────────
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

  /**
   * Opens the cropper for an EXISTING (already uploaded, locally-hosted) photo.
   * photo.imagePath is already an absolute URL (see resolveMediaUrl above),
   * so this fetches it directly from the API server (localhost:7041).
   * Requires the API's CORS policy to allow this origin for the fetch to
   * succeed and for the canvas export to not be "tainted".
   */
  async editExistingPhoto(photo: CaseFileResponse): Promise<void> {
    this.existingPhotoEditError.set(null);
    try {
      const response = await fetch(photo.imagePath, { mode: 'cors' });
      if (!response.ok) throw new Error('fetch failed');

      const blob = await response.blob();
      const file = new File([blob], `existing_${photo.id}.jpg`, { type: blob.type || 'image/jpeg' });

      // Build a fake input-change Event so ngx-image-cropper accepts it
      // the same way it accepts a real file input change event.
      const fakeEvent = { target: { files: [file] } } as unknown as Event;

      this.cropTargetExistingId.set(photo.id);
      this.cropImageEvent.set(fakeEvent);
    } catch {
      this.existingPhotoEditError.set('تعذر تحميل الصورة للتعديل. حاول مرة أخرى.');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // New Primary Photo with Cropper (Exact logic as Create)
  // ─────────────────────────────────────────────────────────────
  onNewPrimarySelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;

    const validation = validateImageFile(file, 5);
    if (!validation.valid) {
      this.newPrimaryError.set(validation.errorMessage ?? null);
      return;
    }

    this.newPrimaryError.set(null);
    this.cropTargetExistingId.set(null); // brand-new upload, not editing an existing one
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

    const targetId = this.cropTargetExistingId();
    const croppedFile = new File([blob], `cropped_${targetId ?? 'new'}_${Date.now()}.jpg`, { type: 'image/jpeg' });

    if (targetId !== null) {
      // Editing an existing photo: treat it as "delete old + upload edited version"
      const wasPrimary = this.primaryPhotoId() === targetId;

      this.deletedPhotoIds.update((ids) => [...ids, targetId]);
      this.existingPhotos.update((list) => list.filter((p) => p.id !== targetId));

      if (wasPrimary) {
        this.newPrimaryImage.set(croppedFile);
        this.newPrimaryPreview.set(URL.createObjectURL(croppedFile));
        this.primaryPhotoId.set(null);
      } else {
        this.newPhotos.update((p) => [...p, croppedFile].slice(0, 5));
        this.newPhotoPreviews.set(this.newPhotos().map((f) => URL.createObjectURL(f)));
      }

      this.cropTargetExistingId.set(null);
    } else {
      // Original flow: cropping a brand-new primary photo upload
      this.newPrimaryImage.set(croppedFile);
      this.newPrimaryPreview.set(URL.createObjectURL(croppedFile));
      this.primaryPhotoId.set(null); // Clear existing primary flag since we introduced a new primary file
    }

    this.cropImageEvent.set(null);
    this.errorMsg.set(null);
  }

  cancelCrop(): void {
    this.cropImageEvent.set(null);
    this.cropTargetExistingId.set(null);
  }

  clearNewPrimary(): void {
    this.newPrimaryImage.set(null);
    this.newPrimaryPreview.set(null);
    this.newPrimaryError.set(null);
  }

  // ─────────────────────────────────────────────────────────────
  // New Additional Photos
  // ─────────────────────────────────────────────────────────────
  onNewPhotosSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    for (const f of files) {
      const validation = validateImageFile(f, 5);
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

  // ─────────────────────────────────────────────────────────────
  // Police Report & Video
  // ─────────────────────────────────────────────────────────────
  onPoliceReportSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;

    const validation = validateImageFile(file, 10);
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
  onSubmit(): void {
    if (this.isSubmitting()) return;
    const hasAtLeastOnePhoto = this.existingPhotos().length > 0 || !!this.newPrimaryImage() || this.newPhotos().length > 0;

    if (this.form.invalid || !hasAtLeastOnePhoto) {
      this.form.markAllAsTouched();
      if (!hasAtLeastOnePhoto) {
        this.errorMsg.set('لازم يفضل في صورة واحدة على الأقل للحالة.');
      }
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set(null);

    const v = this.form.getRawValue();

    const request: LongTermCaseUpdateRequest = {
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
      eventDate: v.eventDate!,
      primaryImage: this.newPrimaryImage() ?? undefined,
      newPhotos: this.newPhotos().length ? this.newPhotos() : null,
      deletedPhotoIds: this.deletedPhotoIds().length ? this.deletedPhotoIds() : null,
      primaryPhotoId: this.primaryPhotoId(),
      video: this.videoFile(),
      policeReportImage: this.policeReportFile(),
    };

    this.service
      .updateCase(this.caseId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.snackbar.success('تم تحديث بيانات الحالة بنجاح.');
          this.router.navigate(['/long-term']);
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          const msg = extractErrorMessage(err, 'حدث خطأ أثناء حفظ التعديلات. حاول مرة أخرى.');
          this.errorMsg.set(msg);
          this.snackbar.error(msg);
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/long-term']);
  }
}