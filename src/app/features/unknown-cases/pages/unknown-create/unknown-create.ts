import { CacheService } from '../../../../core/cache/cache.service';
import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CaseType } from '../../../../shared/enums/case-type';
import { CaseMediaUploaderComponent, CaseMediaPayload } from '../../../../shared/components/cases-components/case-media-uploader/case-media-uploader';
import { CaseFormContainerComponent } from '../../../../shared/components/cases-components/case-form-container/case-form-container';
import { CasePersonDataComponent } from '../../../../shared/components/cases-components/case-person-data/case-person-data';
import { CaseLocationDataComponent } from '../../../../shared/components/cases-components/case-location-data/case-location-data';
import { UnknownCaseService } from '../../services/unknown-case.service';
import { UnknownCaseCreateRequest } from '../../models/request/UnknownCaseCreateRequest';
import { Gender } from '../../../../shared/enums/gender';
import {
  EGYPT_GOVERNORATES,
  getCitiesForGovernorate,
} from '../../../../core/constants/governorates';
import {
  getFormFieldError,
  isFieldInvalid,
} from '../../../../shared/helper/form-validation.helper';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ForceCreatePopupComponent } from '../../../../shared/components/cases-components/force-create-popup/force-create-popup.component';
import { MatchedCaseResponse } from '../../../../core/models/cases.model';
import { DuplicateDecision } from '../../../../shared/enums/duplicate-decision';
import { DuplicateInfoDialogComponent } from '../../../../shared/components/cases-components/duplicate-info-dialog/duplicate-info-dialog.component';

import { debounceTime, Observable } from 'rxjs';
import { handleDuplicateDecision } from '../../../../shared/helper/case-duplicate.helper';

// Shared validators
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { validCity } from '../../../../shared/validators/city.validator';
import { validGovernorate } from '../../../../shared/validators/governorate.validator';
import {
  CaseFormStep,
  localDateInputValue,
  nextCaseFormStep,
  previousCaseFormStep,
  validateStepControls,
  validateCaseSubmission,
} from '../../../../shared/helper/case-form.helper';
import { executeCaseSubmissionFlow, CaseSubmissionResponse } from '../../../../shared/helper/case-submission-flow.helper';
import { saveCreateDraft, restoreCreateDraft } from '../../../../shared/helper/case-cache.helper';

type Step = CaseFormStep;

const DRAFT_CACHE_KEY = 'UnknownCreate_Draft';

interface UnknownCreateCustomData {
  showForceCreatePopup: boolean;
  showDuplicateInfoDialog: boolean;
  currentDuplicateDecision: DuplicateDecision;
  isBlockedDuplicate: boolean;
  matchedCases: MatchedCaseResponse[];
  existingCaseType: CaseType | null;
}

@Component({
  selector: 'app-unknown-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CaseMediaUploaderComponent,
    CaseFormContainerComponent,
    CasePersonDataComponent,
    CaseLocationDataComponent,
    ForceCreatePopupComponent,
    DuplicateInfoDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./unknown-create.css'],
  templateUrl: './unknown-create.html',
})
export class UnknownCreate implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(UnknownCaseService);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);
  private destroyRef = inject(DestroyRef);
  private cacheService = inject(CacheService);

  mediaUploader = viewChild<CaseMediaUploaderComponent>(CaseMediaUploaderComponent);

  currentStep = signal<Step>(1);
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  // Initial media state (for Cache restoration)
  initialPrimary = signal<File | null>(null);
  initialAdditional = signal<File[]>([]);
  initialVideo = signal<File | null>(null);

  // Active media state from the uploader
  mediaPayload = signal<CaseMediaPayload>({
    primaryImage: null,
    additionalImages: [],
    video: null,
    deletedImageIds: [],
    primaryPhotoId: null,
  });

  // Media validation errors from backend
  mediaErrors = signal<{
    primary?: string | null;
    additional?: string | null;
    video?: string | null;
  }>({});

  onMediaChange(payload: CaseMediaPayload): void {
    this.mediaPayload.set(payload);
    this.saveDraft();
  }

  showForceCreatePopup = signal(false);
  showDuplicateInfoDialog = signal(false);
  currentDuplicateDecision = signal<DuplicateDecision>(DuplicateDecision.None);
  isBlockedDuplicate = signal(false);
  matchedCases = signal<MatchedCaseResponse[]>([]);
  existingCaseType = signal<CaseType | null>(null);

  private submittedSuccessfully = signal(false);
  private pendingRequest = signal<UnknownCaseCreateRequest | null>(null);

  readonly genders = Gender;
  readonly caseTypes = CaseType;
  readonly governorates = EGYPT_GOVERNORATES;
  readonly today = localDateInputValue();

  readonly steps = [
    { num: 1, label: 'بيانات الشخص' },
    { num: 2, label: 'موقع العثور عليه' },
    { num: 3, label: 'صور' },
  ];

  stepTitle = computed(() => {
    return ['بيانات الشخص (إن وُجدت)', 'موقع العثور عليه', 'صور'][this.currentStep() - 1];
  });

  stepHeader = computed(() => {
    switch (this.currentStep()) {
      case 1:
        return {
          icon: 'person',
          title: 'بيانات الشخص المفقود',
          description: 'أدخل البيانات الأساسية للشخص المفقود للمساعدة في التعرف عليه.',
        };
      case 2:
        return {
          icon: 'location_on',
          title: 'موقع وتفاصيل الحادث',
          description: 'يجب تحديد الموقع والتاريخ بدقة عالية.',
        };
      case 3:
        return {
          icon: 'photo_library',
          title: 'صور وفيديو',
          description: 'ارفع الصور والمستندات ومقاطع الفيديو المتاحة.',
        };
      default:
        return null;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Form definition
  // ─────────────────────────────────────────────────────────────
  form = this.fb.nonNullable.group({
    fName: this.fb.control<string | null>(null, [arabicText(), Validators.minLength(2), Validators.maxLength(60)]),
    sName: this.fb.control<string | null>(null, [arabicText(), Validators.minLength(2), Validators.maxLength(60)]),
    tName: this.fb.control<string | null>(null, [arabicText(), Validators.minLength(2), Validators.maxLength(60)]),
    lName: this.fb.control<string | null>(null, [arabicText(), Validators.minLength(2), Validators.maxLength(60)]),
    age: this.fb.control<number | null>(null, [Validators.required, Validators.min(1), Validators.max(120)]),
    gender: this.fb.control<Gender | null>(null, [Validators.required, validEnum(Gender)]),
    communicationPhone: this.fb.control<string | null>(null, [egyptianPhone(), Validators.maxLength(15)]),
    description: this.fb.control<string | null>(null, [Validators.maxLength(2000)]),
    government: [
      '',
      [Validators.required, validGovernorate(), Validators.minLength(2), Validators.maxLength(100)],
    ],
    city: ['', [Validators.required]],
    street: ['', [Validators.required, Validators.maxLength(200)]],
    eventDate: ['', [Validators.required, pastDate()]],
  });

  getFieldError(field: string): string | null {
    return getFormFieldError(this.form, field);
  }

  isInvalid(field: string): boolean {
    return isFieldInvalid(this.form, field);
  }

  readonly isInvalidFn = this.isInvalid.bind(this);
  readonly getErrorFn = this.getFieldError.bind(this);

  availableCities = signal<string[]>([]);

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef), debounceTime(500))
      .subscribe(() => {
        this.saveDraft();
      });
  }

  // ─────────────────────────────────────────────────────────────
  // Draft / Cache
  // ─────────────────────────────────────────────────────────────
  saveDraft(): void {
    if (this.submittedSuccessfully()) return;
    saveCreateDraft<any, UnknownCreateCustomData>(
      this.cacheService,
      DRAFT_CACHE_KEY,
      this.form,
      this.currentStep(),
      this.mediaPayload(),
      {
        showForceCreatePopup: this.showForceCreatePopup(),
        showDuplicateInfoDialog: this.showDuplicateInfoDialog(),
        currentDuplicateDecision: this.currentDuplicateDecision(),
        isBlockedDuplicate: this.isBlockedDuplicate(),
        matchedCases: this.matchedCases(),
        existingCaseType: this.existingCaseType(),
      }
    );
  }

  ngOnInit(): void {
    this.form
      .get('city')
      ?.setValidators([
        Validators.required,
        validCity(() => this.form.get('government')?.value ?? null),
      ]);
    this.form.get('city')?.updateValueAndValidity();

    this.form
      .get('government')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((gov) => {
        const cities = getCitiesForGovernorate(gov);
        this.availableCities.set(cities);
        const currentCity = this.form.get('city')?.value;
        if (currentCity && !cities.includes(currentCity)) {
          this.form.get('city')?.setValue('');
        }
        this.form.get('city')?.updateValueAndValidity();
      });

    const draft = restoreCreateDraft<any, UnknownCreateCustomData>(
      this.cacheService,
      DRAFT_CACHE_KEY,
      this.form,
      (s) => this.currentStep.set(s),
      {
        primary: (f) => this.initialPrimary.set(f),
        additional: (fs) => this.initialAdditional.set(fs),
        video: (f) => this.initialVideo.set(f)
      }
    );

    if (draft) {
      this.showForceCreatePopup.set(draft.showForceCreatePopup);
      this.showDuplicateInfoDialog.set(draft.showDuplicateInfoDialog);
      this.currentDuplicateDecision.set(draft.currentDuplicateDecision || DuplicateDecision.None);
      this.isBlockedDuplicate.set(draft.isBlockedDuplicate);
      this.matchedCases.set(draft.matchedCases);
      this.existingCaseType.set(draft.existingCaseType);

      this.mediaPayload.set({
        primaryImage: draft.newPrimaryImage ?? null,
        additionalImages: draft.newAdditionalImages ?? [],
        video: draft.newVideo ?? null,
        deletedImageIds: [],
        primaryPhotoId: null,
      });
    }
  }

  private readonly stepControls: Record<1 | 2, string[]> = {
    1: ['isNameKnown', 'name', 'age', 'gender', 'communicationPhone', 'description'],
    2: ['government', 'city', 'street', 'eventDate'],
  };

  nextStep(): void {
    const current = this.currentStep();
    const fields = this.stepControls[current as 1 | 2] ?? [];
    if (validateStepControls(this.form, fields)) return;
    this.currentStep.set(nextCaseFormStep(current));
    this.errorMsg.set(null);
  }

  prevStep(): void {
    this.currentStep.set(previousCaseFormStep(this.currentStep()));
  }

  // ─────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────
  onSubmit(forceCreate = false): void {
    if (this.isSubmitting()) return;

    if (!forceCreate || (forceCreate && !this.pendingRequest())) {
      const uploader = this.mediaUploader();
      if (uploader) {
        const validation = validateCaseSubmission(this.form, uploader);
        if (!validation.valid) {
          this.errorMsg.set(validation.message ?? null);
          return;
        }
      }
    }

    let request: UnknownCaseCreateRequest;
    const pending = this.pendingRequest();

    if (forceCreate && pending) {
      request = pending;
    } else {
      const builtRequest = this.buildCreateRequest();
      if (!builtRequest) {
        return;
      }
      request = builtRequest;
      this.pendingRequest.set(request);
    }

    if (forceCreate && !request.primaryImage) {
      this.errorMsg.set('يرجى إعادة إرفاق الصورة الأساسية قبل المتابعة.');
      this.showForceCreatePopup.set(false);
      this.showDuplicateInfoDialog.set(false);
      return;
    }

    this.isSubmitting.set(true);
    this.errorMsg.set(null);

    executeCaseSubmissionFlow(
      this.service.createCase(request, forceCreate) as unknown as Observable<CaseSubmissionResponse<any>>,
      {
        isSubmitting: this.isSubmitting,
        errorMsg: this.errorMsg,
        mediaErrors: this.mediaErrors,
        form: this.form,
        cacheService: this.cacheService,
        draftKey: DRAFT_CACHE_KEY,
        snackbar: this.snackbar,
        router: this.router,
        successRoute: ['/unknown-cases'],
        successMessage: 'تم إضافة الحالة بنجاح وبانتظار المراجعة.',
        onSuccess: () => {
          this.submittedSuccessfully.set(true);
        },
        closeDialogs: () => {
          this.showForceCreatePopup.set(false);
          this.showDuplicateInfoDialog.set(false);
        },
        handleDuplicate: (data) => {
          handleDuplicateDecision(data as any, {
            setDecision: (d) => this.currentDuplicateDecision.set(d),
            setBlocked: (b) => this.isBlockedDuplicate.set(b),
            setMatchedCases: (c) => this.matchedCases.set(c),
            setExistingCaseType: (t) => this.existingCaseType.set(t),
            showInfoDialog: () => this.showDuplicateInfoDialog.set(true),
            showForceCreatePopup: () => this.showForceCreatePopup.set(true),
          });
        },
        onComplete: () => {
          this.pendingRequest.set(null);
        },
        defaultErrorMessage: 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.'
      }
    );
  }

  onForceCreateCancel(): void {
    this.showForceCreatePopup.set(false);
    this.pendingRequest.set(null);
  }

  onForceCreateConfirm(): void {
    if (this.isBlockedDuplicate()) {
      return;
    }
    this.showForceCreatePopup.set(false);
    this.onSubmit(true);
  }

  onPendingDialogClose() {
    this.showDuplicateInfoDialog.set(false);
    this.pendingRequest.set(null);
  }

  onPendingDialogContinueCreate(): void {
    if (this.isBlockedDuplicate()) {
      return;
    }
    this.showDuplicateInfoDialog.set(false);
    this.onSubmit(true);
  }

  goBack(): void {
    this.router.navigate(['/unknown']);
  }

  private buildCreateRequest(): UnknownCaseCreateRequest | null {
    const v = this.form.getRawValue();
    const media = this.mediaPayload();

    const primaryImage = media.primaryImage ?? this.initialPrimary();
    const additionalImages = media.additionalImages.length
      ? media.additionalImages
      : this.initialAdditional();
    const video = media.video ?? this.initialVideo();

    if (!primaryImage) {
      this.errorMsg.set('يرجى إعادة إرفاق الصورة الأساسية قبل المتابعة.');
      return null;
    }

    let fName: string | null = v.fName || null;
    let sName: string | null = v.sName || null;
    let tName: string | null = v.tName || null;
    let lName: string | null = v.lName || null;

    return {
      fName: fName,
      lName: lName,
      sName: sName,
      tName: tName,
      gender: v.gender as Gender,
      age: Number(v.age ?? 0),
      communicationPhone: v.communicationPhone || null,
      description: v.description || null,
      government: v.government ?? '',
      city: v.city ?? '',
      street: v.street ?? '',
      eventDate: v.eventDate ?? '',
      primaryImage: primaryImage,
      additionalImages: additionalImages.length ? additionalImages : null,
      video: video ?? null,
    };
  }
}
