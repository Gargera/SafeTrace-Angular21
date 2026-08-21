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
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { debounceTime } from 'rxjs';

import { UnknownCaseService } from '../../services/unknown-case.service';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { CacheService } from '../../../../core/cache/cache.service';

import { CaseFormContainerComponent } from '../../../../shared/components/cases-components/case-form-container/case-form-container';
import { CasePersonDataComponent } from '../../../../shared/components/cases-components/case-person-data/case-person-data';
import { CaseLocationDataComponent } from '../../../../shared/components/cases-components/case-location-data/case-location-data';
import { CaseMediaUploaderComponent } from '../../../../shared/components/cases-components/case-media-uploader/case-media-uploader';
import { ForceCreatePopupComponent } from '../../../../shared/components/cases-components/force-create-popup/force-create-popup.component';
import { DuplicateInfoDialogComponent } from '../../../../shared/components/cases-components/duplicate-info-dialog/duplicate-info-dialog.component';

import { UnknownCaseCreateRequest } from '../../models/request/UnknownCaseCreateRequest';
import { MatchedCaseResponse } from '../../../../core/models/cases.model';

import { CaseType } from '../../../../shared/enums/case-type';
import { Gender } from '../../../../shared/enums/gender';
import { DuplicateDecision } from '../../../../shared/enums/duplicate-decision';

import { EGYPT_GOVERNORATES } from '../../../../core/constants/governorates';

import { useCaseMediaState } from '../../../../shared/helper/cases-helper/case-media.helper';
import { useCaseFormErrors } from '../../../../shared/helper/cases-helper/case-form-errors.helper';
import { bindGovernorateCityValidation } from '../../../../shared/helper/cases-helper/case-location-sync.helper';
import { useCaseDuplicateHandler } from '../../../../shared/helper/cases-helper/case-duplicate-handler.helper';
import { DuplicateDecisionPayload } from '../../../../shared/helper/cases-helper/case-duplicate.helper';
import { executeCaseSubmissionFlow, CaseSubmissionFlowDeps } from '../../../../shared/helper/cases-helper/case-submission-flow.helper';
import { saveCreateDraft, restoreCreateDraft, CreateDraft } from '../../../../shared/helper/cases-helper/case-cache.helper';
import {
  CaseFormStep,
  localDateInputValue,
  nextCaseFormStep,
  previousCaseFormStep,
  validateStepControls,
  validateCaseSubmission,
} from '../../../../shared/helper/cases-helper/case-form.helper';

import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { validGovernorate } from '../../../../shared/validators/governorate.validator';

type Step = CaseFormStep;

export const UNKNOWN_CREATE_DRAFT_KEY = 'UnknownCreate_Draft';

interface UnknownCreateCustomData {
  showForceCreatePopup: boolean;
  showDuplicateInfoDialog: boolean;
  currentDuplicateDecision: DuplicateDecision;
  isBlockedDuplicate: boolean;
  matchedCases: MatchedCaseResponse[];
  existingCaseType: CaseType | null;
}

interface UnknownCreateFormValue {
  fName: string | null;
  sName: string | null;
  tName: string | null;
  lName: string | null;
  age: number | null;
  gender: Gender | null;
  communicationPhone: string | null;
  description: string | null;
  government: string;
  city: string;
  street: string;
  eventDate: string;
}

@Component({
  selector: 'app-unknown-create',
  standalone: true,
  imports: [
    CommonModule,
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

  // Active media state from the uploader

  // Media validation errors from backend

  private pendingRequest = signal<UnknownCaseCreateRequest | null>(null);

  duplicateHandler = useCaseDuplicateHandler({
    saveDraft: () => this.saveDraft(),
    onSubmit: (f) => this.onSubmit(f),
    pendingRequest: this.pendingRequest
  });

  showForceCreatePopup = this.duplicateHandler.showForceCreatePopup;
  showDuplicateInfoDialog = this.duplicateHandler.showDuplicateInfoDialog;
  currentDuplicateDecision = this.duplicateHandler.currentDuplicateDecision;
  isBlockedDuplicate = this.duplicateHandler.isBlockedDuplicate;
  matchedCases = this.duplicateHandler.matchedCases;
  existingCaseType = this.duplicateHandler.existingCaseType;

  handleDuplicate = this.duplicateHandler.handleDuplicate;
  onForceCreateCancel = this.duplicateHandler.onForceCreateCancel;
  onForceCreateConfirm = this.duplicateHandler.onForceCreateConfirm;
  onPendingDialogClose = this.duplicateHandler.onPendingDialogClose;
  onPendingDialogContinueCreate = this.duplicateHandler.onPendingDialogContinueCreate;

  private submittedSuccessfully = signal(false);

  readonly genders = Gender;
  readonly caseTypes = CaseType;
  readonly governorates = EGYPT_GOVERNORATES;
  readonly today = localDateInputValue();

  readonly steps = [
    { num: 1, label: 'بيانات الشخص' },
    { num: 2, label: 'موقع العثور عليه' },
    { num: 3, label: 'المستندات و الصور' },
  ];

  stepTitle = computed(() => {
    return ['بيانات الشخص (إن وُجدت)', 'موقع العثور عليه', 'المستندات و الصور'][this.currentStep() - 1];
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
          title: 'المستندات و الصور',
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

  // ─────────────────────────────────────────────────────────────
  // Error message helpers
  // ─────────────────────────────────────────────────────────────
  private formErrors = useCaseFormErrors(this.form);
  getFieldError = this.formErrors.getFieldError;
  isInvalid = this.formErrors.isInvalid;
  isInvalidFn = this.formErrors.isInvalidFn;
  getErrorFn = this.formErrors.getErrorFn;

  availableCities = signal<string[]>([]);

  mediaState = useCaseMediaState({
    onSaveDraft: () => this.saveDraft()
  });

  initialPrimary = this.mediaState.initialPrimary;
  initialOriginalPrimary = this.mediaState.initialOriginalPrimary;
  initialAdditional = this.mediaState.initialAdditional;
  initialVideo = this.mediaState.initialVideo;
  mediaPayload = this.mediaState.mediaPayload;
  mediaErrors = this.mediaState.mediaErrors;
  onMediaChange = this.mediaState.onMediaChange;

  clearMediaError(field: 'primary' | 'additional' | 'video'): void {
    this.mediaErrors.update((errors: any) => ({
      ...errors,
      [field]: null
    }));
  }

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
    saveCreateDraft<UnknownCreateFormValue, UnknownCreateCustomData>(
      this.cacheService,
      UNKNOWN_CREATE_DRAFT_KEY,
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
    bindGovernorateCityValidation(this.form, this.destroyRef, this.availableCities);

    const draft = restoreCreateDraft<UnknownCreateFormValue, UnknownCreateCustomData>(
      this.cacheService,
      UNKNOWN_CREATE_DRAFT_KEY,
      this.form,
      (s) => this.currentStep.set(s),
      {
        primary: (f) => this.initialPrimary.set(f),
        originalPrimary: (f) => this.initialOriginalPrimary.set(f),
        additional: (fs) => this.initialAdditional.set(fs),
        video: (f) => this.initialVideo.set(f)
      }
    );

    if (draft) {
      this.showForceCreatePopup.set(draft.showForceCreatePopup ?? false);
      this.showDuplicateInfoDialog.set(draft.showDuplicateInfoDialog ?? false);
      this.currentDuplicateDecision.set(draft.currentDuplicateDecision ?? DuplicateDecision.None);
      this.isBlockedDuplicate.set(draft.isBlockedDuplicate ?? false);
      this.matchedCases.set(draft.matchedCases ?? []);
      this.existingCaseType.set(draft.existingCaseType ?? null);

      this.restoreMediaFromDraft(draft);
    }
  }

  private restoreMediaFromDraft(draft: CreateDraft<UnknownCreateFormValue> & UnknownCreateCustomData): void {
    this.mediaPayload.set({
      primaryImage: draft.newPrimaryImage ?? null,
      additionalImages: draft.newAdditionalImages ?? [],
      video: draft.newVideo ?? null,
      deletedImageIds: [],
      primaryPhotoId: null,
      originalPrimaryImage: draft.originalPrimaryImage ?? null
    });
  }

  private readonly stepControls: Partial<Record<CaseFormStep, string[]>> = {
    1: [
      'fName',
      'sName',
      'tName',
      'lName',
      'age',
      'gender',
      'communicationPhone',
      'description',
    ],
    2: ['government', 'city', 'street', 'eventDate'],
  };

  nextStep(): void {
    const current = this.currentStep();
    const fields = this.stepControls[current] ?? [];
    if (validateStepControls(this.form, fields)) return;
    this.currentStep.set(nextCaseFormStep(current));
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
      this.mediaErrors.set({ primary: 'يرجى إرفاق الصورة الأساسية.' });
      this.showForceCreatePopup.set(false);
      this.showDuplicateInfoDialog.set(false);
      return;
    }

    this.mediaErrors.set({});

    executeCaseSubmissionFlow(
      this.service.createCase(request, forceCreate),
      this.getSubmissionDependencies()
    );
  }

  private getSubmissionDependencies(): CaseSubmissionFlowDeps<DuplicateDecisionPayload> {
    return {
      isSubmitting: this.isSubmitting,
      errorMsg: this.errorMsg,
      mediaErrors: this.mediaErrors,
      form: this.form,
      cacheService: this.cacheService,
      draftKey: UNKNOWN_CREATE_DRAFT_KEY,
      snackbar: this.snackbar,
      router: this.router,
      successRoute: ['/unknown'],
      successMessage: 'تم إنشاء البلاغ بنجاح، وسيتم مراجعته من قِبَل الإدارة قبل النشر.',
      onSuccess: () => {
        this.submittedSuccessfully.set(true);
      },
      closeDialogs: () => {
        this.showForceCreatePopup.set(false);
        this.showDuplicateInfoDialog.set(false);
      },
      handleDuplicate: (data: DuplicateDecisionPayload) => this.handleDuplicate(data),
      onComplete: () => {
        this.pendingRequest.set(null);
      },
      defaultErrorMessage: 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.'
    };
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
      this.mediaErrors.set({ primary: 'يرجى إرفاق الصورة الأساسية.' });
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
