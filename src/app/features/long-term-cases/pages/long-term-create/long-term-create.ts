import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';

import { LongTermCaseService } from '../../services/long-term-case.service';
import { LongTermCaseCreateRequest } from '../../models/request/LongTermCaseCreateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/relation.type.dictionary';
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
  selector: 'app-long-term-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ForceCreatePopupComponent,
    ButtonComponent,
    FormField,
    ImageCropperComponent // 👈 تفعيل المكون هنا
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../../../../shared/styles/case-form.css', './long-term-create.css'],
  templateUrl: './long-term-create.html',
})
export class LongTermCreate {
  private fb = inject(FormBuilder);
  private service = inject(LongTermCaseService);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);

  currentStep: Step = 1;
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  // إشارات التحكّم بالـ Cropper والصورة الأساسية
  cropImageEvent = signal<any>(null);
  croppedPrimaryImagePreview = signal<string | null>(null);
  tempCroppedBlob = signal<Blob | null>(null);
  primaryPhotoFile = signal<File | null>(null);

  // إشارات الصور الإضافية والمستندات
  additionalPhotos = signal<File[]>([]);
  additionalPhotoPreviews = signal<string[]>([]);
  policeReportFile = signal<File | null>(null);
  videoFile = signal<File | null>(null);

  showForceCreatePopup = signal(false);
  isBlockedDuplicate = signal(false);
  matchedCases = signal<MatchedCaseDto[]>([]);
  private pendingRequest: LongTermCaseCreateRequest | null = null;

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

  form = this.fb.group({
    fName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), arabicTextValidator()]],
    sName: ['', [Validators.minLength(2), Validators.maxLength(60), arabicTextValidator()]],
    tName: ['', [Validators.minLength(2), Validators.maxLength(60), arabicTextValidator()]],
    lName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), arabicTextValidator()]],
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(120)]],
    gender: ['' as Gender | '', [Validators.required, enumValidator(Gender)]],
    relation: [null as RelationType | null, [Validators.required, enumValidator(RelationType)]],
    communicationPhone: ['', [Validators.maxLength(15), egyptianPhoneValidator()]],
    description: ['', [Validators.maxLength(2000)]],
    government: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), arabicTextValidator()]],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), arabicTextValidator()]],
    street: ['', [Validators.required, Validators.maxLength(200)]],
    eventDate: ['', [Validators.required, pastDateValidator()]],
    primaryImage: [null as File | null, [Validators.required, fileTypeValidator(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']), maxFileSizeValidator(5)]],
    additionalImages: [[] as File[], [fileTypeValidator(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']), maxFileSizeValidator(5), maxFileCountValidator(4)]],
    policeReportImage: [null as File | null, [fileTypeValidator(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']), maxFileSizeValidator(10)]]
  });

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
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

  // ---- 1. إدارة الصورة الأساسية مع الـ Cropper ----

  onPrimaryPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.cropImageEvent.set(event); // فتح واجهة الـ Crop فور الاختيار
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

    // تحويل الـ Blob إلى ملف جاهز للـ Backend
    const croppedFile = new File([blob], 'primary_image.jpg', { type: 'image/jpeg' });
    this.primaryPhotoFile.set(croppedFile);

    // إنشاء رابط للمعاينة وإغلاق الـ Cropper
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

  // ---- 2. إدارة الصور الإضافية ----

  onAdditionalPhotosSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    this.additionalPhotos.update((p) => [...p, ...files].slice(0, 4)); // حد أقصى 4 صور إضافية
    this.refreshAdditionalPreviews();
    this.form.get('additionalImages')?.setValue(this.additionalPhotos());
    this.form.get('additionalImages')?.markAsDirty();
  }

  private refreshAdditionalPreviews(): void {
    this.additionalPhotoPreviews.set(this.additionalPhotos().map((f) => URL.createObjectURL(f)));
  }

  removeAdditionalPhoto(index: number): void {
    this.additionalPhotos.update((p) => p.filter((_, i) => i !== index));
    this.refreshAdditionalPreviews();
    this.form.get('additionalImages')?.setValue(this.additionalPhotos());
    this.form.get('additionalImages')?.markAsDirty();
  }

  // ---- 3. المرفقات الأخرى ----
  onPoliceReportSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.policeReportFile.set(file);
    this.form.get('policeReportImage')?.setValue(file);
    this.form.get('policeReportImage')?.markAsDirty();
  }

  onVideoSelected(event: Event): void {
    this.videoFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  // ---- 4. الإرسال للباك إند ----

  onSubmit(forceCreate = false): void {
    const primaryImg = this.primaryPhotoFile();

    if (!forceCreate && (this.form.invalid || !primaryImg)) {
      this.form.markAllAsTouched();
      if (!primaryImg) {
        this.errorMsg.set('برجاء إضافة الصورة الأساسية للشخص وتحديد الوجه.');
      } else {
        this.errorMsg.set('برجاء تصحيح الأخطاء في النموذج.');
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

      this.service.createCase(request, forceCreate).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          const data = res.data;

          // في حالة وجود تكرار وعدم إتمام الإنشاء
          if (data && (data.isCreated === false || data.isCreated === undefined)) {
            if (data.matchedCases) {
              this.matchedCases.set(data.matchedCases.map(mapMatchedCaseResponseToDto));
            } else {
              this.matchedCases.set([]);
            }

            const rawData = data as any;
            const isSameType = rawData.isSameTypeDuplicate ?? rawData.IsSameTypeDuplicate ?? false;

            this.isBlockedDuplicate.set(Boolean(isSameType));
            this.isBlockedDuplicate.set(!!rawData.isSameTypeDuplicate);

            this.showForceCreatePopup.set(true);
            return;
          }

          this.showForceCreatePopup.set(false);
          this.snackbar.success('تم إرسال بلاغ الحالة بنجاح، هيتم مراجعته من الإدارة قريبًا.');
          this.router.navigate(['/long-term']);
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
    if (this.isBlockedDuplicate()) {
      return;
    }
    this.showForceCreatePopup.set(false);
    this.onSubmit(true);
  }

  goBack(): void {
    this.router.navigate(['/long-term']);
  }
}