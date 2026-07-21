import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UrgentCaseService } from '../../services/urgent-case.service';
import { UrgentCaseUpdateRequest } from '../../models/request/UrgentCaseUpdateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/relation.type.dictionary';
import { EGYPT_GOVERNORATES } from '../../../../core/constants/governorates';
import { MapLocationPickerComponent } from '../../../../shared/components/map-location-picker/map-location-picker';
import { SnackbarService } from '../../../../core/services/toast.service';
import { CaseFileResponse } from '../../../../shared/models/responses/case-file.model';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { pastDateValidator } from '../../../../shared/validators/past-date.validator';
import { egyptianPhoneValidator } from '../../../../shared/validators/egyptian-phone.validator';
import { fileTypeValidator } from '../../../../shared/validators/file-type.validator';
import { maxFileSizeValidator } from '../../../../shared/validators/max-file-size.validator';
import { maxFileCountValidator } from '../../../../shared/validators/max-file-count.validator';
import { arabicTextValidator } from '../../../../shared/validators/arabic-text.validator';
import { enumValidator } from '../../../../shared/validators/enum.validator';

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-urgent-update',
  standalone: true,
  imports: [ReactiveFormsModule, MapLocationPickerComponent, ButtonComponent, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../../../../shared/styles/case-form.css', './urgent-update.css'],
  templateUrl: './urgent-update.html',
})
export class UrgentUpdate implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(UrgentCaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackbar = inject(SnackbarService);

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

  existingVideoUrl = signal<string | null>(null);
  videoFile = signal<File | null>(null);

  selectedLat = signal<number | null>(null);
  selectedLng = signal<number | null>(null);
  selectedAddress = signal<string>('');
  /** initial coords passed to the map picker so it centers on the existing location */
  initialMapCenter = signal<{ lat: number; lng: number } | null>(null);

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

  form = this.fb.group({
    fName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), arabicTextValidator()]],
    sName: ['', [Validators.minLength(2), Validators.maxLength(60), arabicTextValidator()]],
    tName: ['', [Validators.minLength(2), Validators.maxLength(60), arabicTextValidator()]],
    lName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), arabicTextValidator()]],
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(120)]],
    gender: ['' as Gender | '', [Validators.required, enumValidator(Gender)]],
    relation: [null as RelationType | null, [Validators.required, enumValidator(RelationType)]],
    communicationPhone: ['', [Validators.required, Validators.maxLength(15), egyptianPhoneValidator()]],
    description: ['', [Validators.maxLength(2000)]],
    government: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), arabicTextValidator()]],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), arabicTextValidator()]],
    street: ['', [Validators.required, Validators.maxLength(200)]],
    eventDate: ['', [Validators.required, pastDateValidator()]],
    primaryImage: [null as File | null, [fileTypeValidator(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']), maxFileSizeValidator(5)]],
    additionalImages: [[] as File[], [fileTypeValidator(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']), maxFileSizeValidator(5), maxFileCountValidator(4)]]
  });

  ngOnInit(): void {
    this.caseId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCase();
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
        }

        const files: CaseFileResponse[] = c.files ?? c.caseFiles ?? [];
        this.existingPhotos.set(files);
        this.primaryPhotoId.set(files.find((f) => f.isPrimary)?.id ?? null);
        this.existingVideoUrl.set(c.video ?? c.videoPath ?? null);

        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'تعذر تحميل بيانات الحالة.');
      },
    });
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  onLocationChange(loc: { lat: number; lng: number; address: string }): void {
    this.selectedLat.set(loc.lat);
    this.selectedLng.set(loc.lng);
    this.selectedAddress.set(loc.address);
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      const fields = ['fName', 'lName', 'age', 'gender', 'relation', 'communicationPhone'];
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
    this.form.get('primaryImage')?.setValue(null);
  }

  onNewPrimarySelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    this.newPrimaryImage.set(file);
    this.newPrimaryPreview.set(URL.createObjectURL(file));
    this.primaryPhotoId.set(null);
    this.form.get('primaryImage')?.setValue(file);
    this.form.get('primaryImage')?.markAsDirty();
  }

  clearNewPrimary(): void {
    this.newPrimaryImage.set(null);
    this.newPrimaryPreview.set(null);
    this.form.get('primaryImage')?.setValue(null);
  }

  onNewPhotosSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    this.newPhotos.update((p) => [...p, ...files].slice(0, 5));
    this.newPhotoPreviews.set(this.newPhotos().map((f) => URL.createObjectURL(f)));
    this.form.get('additionalImages')?.setValue(this.newPhotos());
    this.form.get('additionalImages')?.markAsDirty();
  }

  removeNewPhoto(index: number): void {
    this.newPhotos.update((p) => p.filter((_, i) => i !== index));
    this.newPhotoPreviews.update((p) => p.filter((_, i) => i !== index));
    this.form.get('additionalImages')?.setValue(this.newPhotos());
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
      else if (this.form.invalid) this.errorMsg.set('برجاء تصحيح الأخطاء في النموذج.');
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
        this.router.navigate(['/urgent-cases', this.caseId]);
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
    this.router.navigate(['/urgent-cases', this.caseId]);
  }
}
