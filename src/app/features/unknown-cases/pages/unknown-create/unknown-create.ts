import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UnknownCaseService } from '../../services/unknown-case.service';
import { UnknownCaseCreateRequest } from '../../models/request/UnknownCaseCreateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { EGYPT_GOVERNORATES } from '../../../../core/constants/governorates';
import { SnackbarService } from '../../../../core/services/toast.service';
import { ForceCreatePopupComponent } from '../../../../shared/components/cases-components/force-create-popup/force-create-popup.component';
import { MatchedCaseDto, mapMatchedCaseResponseToDto } from '../../../../shared/models/responses/matched-case.model';
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
  selector: 'app-unknown-create',
  standalone: true,
  imports: [ReactiveFormsModule, ForceCreatePopupComponent, ButtonComponent, FormField],
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

  selectedPhotos = signal<File[]>([]);
  photoPreviews = signal<string[]>([]);
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
    fName: ['', [Validators.minLength(2), Validators.maxLength(60), arabicTextValidator()]],
    sName: ['', [Validators.minLength(2), Validators.maxLength(60), arabicTextValidator()]],
    tName: ['', [Validators.minLength(2), Validators.maxLength(60), arabicTextValidator()]],
    lName: ['', [Validators.minLength(2), Validators.maxLength(60), arabicTextValidator()]],
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(120)]],
    gender: ['' as Gender | '', [Validators.required, enumValidator(Gender)]],
    communicationPhone: ['', [Validators.maxLength(15), egyptianPhoneValidator()]],
    description: ['', [Validators.maxLength(2000)]],
    government: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), arabicTextValidator()]],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), arabicTextValidator()]],
    street: ['', [Validators.required, Validators.maxLength(200)]],
    eventDate: ['', [Validators.required, pastDateValidator()]],
    primaryImage: [null as File | null, [Validators.required, fileTypeValidator(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']), maxFileSizeValidator(5)]],
    additionalImages: [[] as File[], [fileTypeValidator(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']), maxFileSizeValidator(5), maxFileCountValidator(4)]]
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

  onPrimaryPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    this.selectedPhotos.update((p) => [file, ...p.slice(1)].slice(0, 5));
    this.form.get('primaryImage')?.setValue(file);
    this.form.get('primaryImage')?.markAsDirty();
    this.refreshPreviews();
  }

  onAdditionalPhotosSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    this.selectedPhotos.update((p) => [...p, ...files].slice(0, 5));
    const additional = this.selectedPhotos().slice(1);
    this.form.get('additionalImages')?.setValue(additional);
    this.form.get('additionalImages')?.markAsDirty();
    this.refreshPreviews();
  }

  private refreshPreviews(): void {
    this.photoPreviews.set(this.selectedPhotos().map((f) => URL.createObjectURL(f)));
  }

  removePhoto(index: number): void {
    this.selectedPhotos.update((p) => p.filter((_, i) => i !== index));
    this.photoPreviews.update((p) => p.filter((_, i) => i !== index));
    const photos = this.selectedPhotos();
    if (index === 0 && photos.length === 0) {
      this.form.get('primaryImage')?.setValue(null);
    } else {
      this.form.get('primaryImage')?.setValue(photos[0] ?? null);
    }
    this.form.get('additionalImages')?.setValue(photos.slice(1));
  }

  onVideoSelected(event: Event): void {
    this.videoFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  onSubmit(forceCreate = false): void {
    if (!forceCreate && this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('برجاء تصحيح الأخطاء في النموذج.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set(null);

    let request: UnknownCaseCreateRequest;
    if (forceCreate && this.pendingRequest) {
      request = this.pendingRequest;
    } else {
      const v = this.form.getRawValue();
      const photos = this.selectedPhotos();
      const [primaryImage, ...additionalImages] = photos;

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
        primaryImage,
        additionalImages: additionalImages.length ? additionalImages : null,
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

          // لو نفس نوع الحالة (Unknown ↔ Unknown): مفيش داعي نوقف اليوزر أو نوريه
          // popup الـ force-create، لأن الباك اند بيعمل merge للحالتين في حالة
          // واحدة تلقائياً. فبنعتبرها نجحت عادي زي أي إنشاء طبيعي.
          if (rawData.isSameTypeDuplicate) {
            this.showForceCreatePopup.set(false);
            this.snackbar.success('تم إرسال البلاغ بنجاح، هيتم مراجعته من الإدارة قريبًا.');
            this.router.navigate(['/unknown']);
            return;
          }

          // لو التطابق مع نوع حالة مختلف (long-term / urgent): نوري اليوزر
          // الحالات المشابهة ويقرر يتواصل مع صاحب البلاغ أو يعمل force create.
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
    this.router.navigate(['/unknown-cases']);
  }
}