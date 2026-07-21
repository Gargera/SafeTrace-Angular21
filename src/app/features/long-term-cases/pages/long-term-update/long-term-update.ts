import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LongTermCaseService } from '../../services/long-term-case.service';
import { LongTermCaseUpdateRequest } from '../../models/request/LongTermCaseUpdateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/relation.type.dictionary';
import { EGYPT_GOVERNORATES } from '../../../../core/constants/governorates';
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

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-long-term-update',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, FormField,
    CardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../../../../shared/styles/case-form.css', './long-term-update.css'],
  templateUrl: './long-term-update.html',
})
export class LongTermUpdate implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(LongTermCaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackbar = inject(SnackbarService);

  caseId!: number;
  currentStep: Step = 1;
  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  // existing (already-uploaded) photos coming from GetCaseDetails
  existingPhotos = signal<CaseFileResponse[]>([]);
  // ids the user marked for deletion
  deletedPhotoIds = signal<number[]>([]);
  // id of the existing photo chosen as primary
  primaryPhotoId = signal<number | null>(null);

  // newly added files in this session
  newPhotos = signal<File[]>([]);
  newPhotoPreviews = signal<string[]>([]);
  newPrimaryImage = signal<File | null>(null);
  newPrimaryPreview = signal<string | null>(null);
  newPrimaryError = signal<string | null>(null);
  newPhotosError = signal<string | null>(null);

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
  // Form definition — validators match backend exactly (Update same as Create)
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

  private loadCase(): void {
    this.isLoading.set(true);
    this.service.getCaseById(this.caseId).subscribe({
      next: (res) => {
        const c = res.data as any;
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

        const files: CaseFileResponse[] = c.files ?? c.caseFiles ?? [];
        this.existingPhotos.set(files);
        this.primaryPhotoId.set(files.find((f) => f.isPrimary)?.id ?? null);

        this.existingPoliceReportUrl.set(c.policeReportImage ?? c.policeReportImagePath ?? null);
        this.existingVideoUrl.set(c.video ?? c.videoPath ?? null);

        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'تعذر تحميل بيانات الحالة.');
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

  // ─────────────────────────────────────────────────────────────
  // File validation constants
  // ─────────────────────────────────────────────────────────────
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  private readonly MAX_PHOTO_BYTES = 5 * 1024 * 1024;     // 5 MB
  private readonly MAX_POLICE_BYTES = 10 * 1024 * 1024;   // 10 MB

  // ----- existing photos -----
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

  // ----- new primary photo -----
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

  // ----- new additional photos -----
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

  // ----- police report — optional, JPEG/PNG/WebP, max 10 MB -----
  onPoliceReportSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    if (!this.ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      this.policeReportError.set('نوع الملف غير مسموح. يُقبل فقط: JPEG, PNG, WebP');
      return;
    }
    if (file.size > this.MAX_POLICE_BYTES) {
      this.policeReportError.set('حجم الملف يتجاوز الحد المسموح (10 MB)');
      return;
    }
    this.policeReportError.set(null);
    this.policeReportFile.set(file);
  }

  // ----- video -----
  onVideoSelected(event: Event): void {
    this.videoFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  onSubmit(): void {
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

    const request: LongTermCaseUpdateRequest = {
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
      primaryImage: this.newPrimaryImage() ?? undefined,
      newPhotos: this.newPhotos().length ? this.newPhotos() : null,
      deletedPhotoIds: this.deletedPhotoIds().length ? this.deletedPhotoIds() : null,
      primaryPhotoId: this.primaryPhotoId(),
      video: this.videoFile(),
      policeReportImage: this.policeReportFile(),
    };

    this.service.updateCase(this.caseId, request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.snackbar.success('تم تحديث بيانات الحالة بنجاح.');
        this.router.navigate(['/long-term-cases', this.caseId]);
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
    this.router.navigate(['/long-term', this.caseId]);
  }
}
