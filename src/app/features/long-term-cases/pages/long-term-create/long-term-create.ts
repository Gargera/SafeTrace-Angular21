import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LongTermCaseService } from '../../services/long-term-case.service';
import { LongTermCaseCreateRequest } from '../../models/request/LongTermCaseCreateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/relation.type.dictionary';
import { EGYPT_GOVERNORATES } from '../../../../core/constants/governorates';
import { SnackbarService } from '../../../../core/services/toast.service';
import { ForceCreatePopupComponent } from '../../../../shared/components/cases-components/force-create-popup/force-create-popup.component';
import { MatchedCaseDto, mapMatchedCaseResponseToDto } from '../../../../shared/models/responses/matched-case.model';

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-long-term-create',
  standalone: true,
  imports: [ReactiveFormsModule, ForceCreatePopupComponent],
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

  selectedPhotos = signal<File[]>([]);
  photoPreviews = signal<string[]>([]);
  policeReportFile = signal<File | null>(null);
  videoFile = signal<File | null>(null);

  showForceCreatePopup = signal(false);
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
    fName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    sName: ['', [Validators.maxLength(100)]],
    tName: ['', [Validators.maxLength(100)]],
    lName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    age: [null as number | null, [Validators.required, Validators.min(0), Validators.max(150)]],
    gender: ['' as Gender | '', Validators.required],
    relation: [null as RelationType | null, Validators.required],
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

  onPrimaryPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    this.selectedPhotos.update((p) => [file, ...p.filter((_, i) => i !== 0)].slice(0, 5));
    this.refreshPreviews();
  }

  onAdditionalPhotosSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    this.selectedPhotos.update((p) => [...p, ...files].slice(0, 5));
    this.refreshPreviews();
  }

  private refreshPreviews(): void {
    this.photoPreviews.set(this.selectedPhotos().map((f) => URL.createObjectURL(f)));
  }

  removePhoto(index: number): void {
    this.selectedPhotos.update((p) => p.filter((_, i) => i !== index));
    this.photoPreviews.update((p) => p.filter((_, i) => i !== index));
  }

  onPoliceReportSelected(event: Event): void {
    this.policeReportFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  onVideoSelected(event: Event): void {
    this.videoFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  onSubmit(forceCreate = false): void {
    if (!forceCreate && (this.form.invalid || this.selectedPhotos().length === 0)) {
      this.form.markAllAsTouched();
      if (this.selectedPhotos().length === 0) {
        this.errorMsg.set('برجاء إضافة صورة واحدة على الأقل للشخص (الصورة الأساسية).');
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
      const photos = this.selectedPhotos();
      const [primaryImage, ...additionalImages] = photos;

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
        primaryImage,
        additionalImages: additionalImages.length ? additionalImages : null,
        video: this.videoFile(),
        policeReportImage: this.policeReportFile(),
      };
      this.pendingRequest = request;
    }

    this.service.createCase(request, forceCreate).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        const data = res.data;

        if (data && data.isCreated === false) {
          this.matchedCases.set((data.matchedCases ?? []).map(mapMatchedCaseResponseToDto));
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
    this.showForceCreatePopup.set(false);
    this.onSubmit(true);
  }

  goBack(): void {
    this.router.navigate(['/long-term-cases']);
  }
}
