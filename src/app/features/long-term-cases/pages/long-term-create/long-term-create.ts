import { useCaseMediaState } from '../../../../shared/helper/cases-helper/case-media.helper';
import { ImageService } from '../../../../shared/services/image.service';
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
import { debounceTime, Observable } from 'rxjs';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CaseMediaPayload, CaseMediaUploaderComponent } from '../../../../shared/components/cases-components/case-media-uploader/case-media-uploader.component';
import { CaseFormContainerComponent } from '../../../../shared/components/cases-components/case-form-container/case-form-container.component';
import { LongTermCaseService } from '../../services/long-term-case.service';
import { LongTermCaseCreateRequest } from '../../models/request/LongTermCaseCreateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { CaseType } from '../../../../shared/enums/case-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/dictionaries/relation.type.dictionary';
import {
  EGYPT_GOVERNORATES,
} from '../../../../core/constants/governorates';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ForceCreatePopupComponent } from '../../../../shared/components/cases-components/force-create-popup/force-create-popup.component';
import { MatchedCaseResponse } from '../../../../core/models/cases.model';
import { DuplicateDecision } from '../../../../shared/enums/duplicate-decision';
import { DuplicateInfoDialogComponent } from '../../../../shared/components/cases-components/duplicate-info-dialog/duplicate-info-dialog.component';

// Shared validators
import { useCaseFormErrors } from '../../../../shared/helper/cases-helper/case-form-errors.helper';
import { bindGovernorateCityValidation } from '../../../../shared/helper/cases-helper/case-location-sync.helper';
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { validGovernorate } from '../../../../shared/validators/governorate.validator';
import {
  CaseFormStep,
  localDateInputValue,
  nextCaseFormStep,
  previousCaseFormStep,
  validateStepControls,
  validateCaseSubmission,
} from '../../../../shared/helper/cases-helper/case-form.helper';
import { executeCaseSubmissionFlow, CaseSubmissionFlowDeps } from '../../../../shared/helper/cases-helper/case-submission-flow.helper';
import { saveCreateDraft, restoreCreateDraft } from '../../../../shared/helper/cases-helper/case-cache.helper';
import { DuplicateDecisionPayload } from '../../../../shared/helper/cases-helper/case-duplicate.helper';
import { useCaseDuplicateHandler } from '../../../../shared/helper/cases-helper/case-duplicate-handler.helper';
import { CaseLocationDataComponent } from "../../../../shared/components/cases-components/case-location-data/case-location-data.component";
import { CasePersonDataComponent } from "../../../../shared/components/cases-components/case-person-data/case-person-data.component";

type Step = CaseFormStep;

export const LONG_TERM_CREATE_DRAFT_KEY = 'LongTermCreate_Draft';

interface LongTermCreateCustomData {
  showForceCreatePopup: boolean;
  showDuplicateInfoDialog: boolean;
  currentDuplicateDecision: DuplicateDecision;
  isBlockedDuplicate: boolean;
  matchedCases: MatchedCaseResponse[];
  existingCaseType: CaseType | null;
  policeReportFile: File | null;
}

interface LongTermCreateFormValue {
  fName: string;
  sName: string | null;
  tName: string | null;
  lName: string;
  age: number | null;
  gender: Gender | null;
  relation: RelationType | null;
  communicationPhone: string | null;
  description: string | null;
  government: string;
  city: string;
  street: string;
  eventDate: string;
}

@Component({
  selector: 'app-long-term-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ForceCreatePopupComponent,
    DuplicateInfoDialogComponent,
    CaseMediaUploaderComponent,
    CaseFormContainerComponent,
    CaseLocationDataComponent,
    CasePersonDataComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./long-term-create.css'],
  templateUrl: './long-term-create.html',
})
export class LongTermCreate implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);
  private destroyRef = inject(DestroyRef);
  private service = inject(LongTermCaseService);
  private cacheService = inject(CacheService);
  private imageService = inject(ImageService);

  mediaUploader = viewChild<CaseMediaUploaderComponent>(CaseMediaUploaderComponent);

  currentStep = signal<Step>(1);
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  // Initial media state (for Cache restoration)

  policeReport = signal<File | null>(null);
  policeReportPreview = signal<string | null>(null);

  // Active media state from the uploader

  // Media validation errors from backend

  private pendingRequest = signal<LongTermCaseCreateRequest | null>(null);

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
  readonly relationOptions = RELATION_TYPE_OPTIONS;
  readonly caseTypes = CaseType;
  readonly governorates = EGYPT_GOVERNORATES;
  readonly today = localDateInputValue();

  readonly steps = [
    { num: 1, label: 'بيانات الشخص' },
    { num: 2, label: 'موقع الاختفاء' },
    { num: 3, label: 'مستندات وصور' },
  ];

  stepTitle = computed(() => {
    return ['بيانات الشخص المفقود', 'آخر موقع معروف', 'مستندات وصور'][this.currentStep() - 1];
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
          title: 'مستندات وصور',
          description: 'ارفع الصور والمستندات ومقاطع الفيديو المتاحة.',
        };
      default:
        return null;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Form definition
  // ─────────────────────────────────────────────────────────────
  form = this.fb.group({
    fName: [
      '',
      [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(60)],
    ],
    sName: ['', [arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    tName: ['', [arabicText(), Validators.minLength(2), Validators.maxLength(60)]],
    lName: [
      '',
      [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(60)],
    ],
    age: [null as number | null, [Validators.required, Validators.min(1), Validators.max(120)]],
    gender: ['' as Gender | '', [Validators.required, validEnum(Gender)]],
    relation: [null as RelationType | null, [Validators.required, validEnum(RelationType)]],
    communicationPhone: ['', [egyptianPhone(), Validators.maxLength(15)]],
    description: ['', [Validators.maxLength(2000)]],
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
    onSaveDraft: () => {
      const self = this as any;
      if (typeof self.saveDraft === 'function') {
        self.saveDraft();
      } else if (typeof self.saveDraftToCache === 'function') {
        self.saveDraftToCache(self.mediaPayload());
      }
    }
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

  private saveDraft(media?: CaseMediaPayload): void {
    if (this.submittedSuccessfully()) return;

    saveCreateDraft<LongTermCreateFormValue, LongTermCreateCustomData>(
      this.cacheService,
      LONG_TERM_CREATE_DRAFT_KEY,
      this.form,
      this.currentStep(),
      media ?? this.mediaPayload(),
      {
        showForceCreatePopup: this.showForceCreatePopup(),
        showDuplicateInfoDialog: this.showDuplicateInfoDialog(),
        currentDuplicateDecision: this.currentDuplicateDecision(),
        isBlockedDuplicate: this.isBlockedDuplicate(),
        matchedCases: this.matchedCases(),
        existingCaseType: this.existingCaseType(),
        policeReportFile: this.policeReport() ?? null,
      }
    );
  }

  ngOnInit(): void {
    bindGovernorateCityValidation(this.form, this.destroyRef, this.availableCities);

    const draft = restoreCreateDraft<LongTermCreateFormValue, LongTermCreateCustomData>(
      this.cacheService,
      LONG_TERM_CREATE_DRAFT_KEY,
      this.form,
      (s) => this.currentStep.set(s),
      {
        primary: (f) => this.initialPrimary.set(f),
        originalPrimary: (f) => this.initialOriginalPrimary.set(f),
        additional: (fs) => this.initialAdditional.set(fs),
        video: (f) => this.initialVideo.set(f),
      }
    );

    if (draft) {
      this.showForceCreatePopup.set(draft.showForceCreatePopup);
      this.showDuplicateInfoDialog.set(draft.showDuplicateInfoDialog);
      this.currentDuplicateDecision.set(draft.currentDuplicateDecision || DuplicateDecision.None);
      this.isBlockedDuplicate.set(draft.isBlockedDuplicate);
      this.matchedCases.set(draft.matchedCases);
      this.existingCaseType.set(draft.existingCaseType);

      if (draft.policeReportFile) {
        this.policeReport.set(draft.policeReportFile);
      }

      this.mediaPayload.set({
        primaryImage: draft.newPrimaryImage ?? null,
        additionalImages: draft.newAdditionalImages ?? [],
        video: draft.newVideo ?? null,
        deletedImageIds: [],
        primaryPhotoId: null,
        originalPrimaryImage: draft.originalPrimaryImage ?? null
      });
    }
  }

  private readonly stepControls: Record<1 | 2, string[]> = {
    1: [
      'fName',
      'sName',
      'tName',
      'lName',
      'age',
      'gender',
      'relation',
      'communicationPhone',
      'description',
    ],
    2: ['government', 'city', 'street', 'eventDate'],
  };

  onPoliceReportSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;

    const validation = this.imageService.validate(file, 10);
    if (!validation.valid) {
      this.mediaErrors.update((errs: Record<string, string | null>) => ({ ...errs, policeReport: validation.errorMessage ?? null }));
      input.value = '';
      return;
    }

    this.mediaErrors.update((errs: Record<string, string | null>) => ({ ...errs, policeReport: null }));
    this.policeReport.set(file);
    if (this.policeReportPreview()) {
      URL.revokeObjectURL(this.policeReportPreview()!);
    }
    this.policeReportPreview.set(URL.createObjectURL(file));
    this.saveDraft();
  }

  removePoliceReport(): void {
    this.policeReport.set(null);
    if (this.policeReportPreview()) {
      URL.revokeObjectURL(this.policeReportPreview()!);
    }
    this.policeReportPreview.set(null);
    this.saveDraft();
  }

  nextStep(): void {
    const current = this.currentStep();
    const fields = this.stepControls[current as 1 | 2] ?? [];
    if (validateStepControls(this.form, fields)) return;
    this.currentStep.set(nextCaseFormStep(current));
  }

  prevStep(): void {
    this.currentStep.set(previousCaseFormStep(this.currentStep()));
  }

  onSubmit(forceCreate = false): void {
    if (this.isSubmitting()) return;
    const primaryImg = this.mediaPayload().primaryImage;

    const pending = this.pendingRequest();
    if (forceCreate && !pending && !primaryImg) {
      this.mediaErrors.set({ primary: 'يرجى إرفاق الصورة الأساسية.' });
      this.showForceCreatePopup.set(false);
      this.showDuplicateInfoDialog.set(false);
      return;
    }

    if (!forceCreate) {
      let valid = true;
      let validationMessage = 'يرجى مراجعة الأخطاء وتصحيحها.';

      const uploader = this.mediaUploader();
      if (uploader) {
        const validation = validateCaseSubmission(this.form, uploader);
        if (!validation.valid) {
          valid = false;
          validationMessage = validation.message || validationMessage;
        }
      }

      if (!valid) {
        this.errorMsg.set(validationMessage);
        return;
      }
    }

    let request: LongTermCaseCreateRequest;
    if (forceCreate && pending) {
      request = pending;
    } else {
      const builtRequest = this.buildCreateRequest();
      request = builtRequest;
      this.pendingRequest.set(request);
    }

    this.mediaErrors.set({});

    executeCaseSubmissionFlow(
      this.service.createCase(request, forceCreate),
      this.getSubmissionDependencies()
    );
  }

  private buildCreateRequest(): LongTermCaseCreateRequest {
    const v = this.form.getRawValue();
    const media = this.mediaPayload();

    return {
      fName: v.fName!,
      lName: v.lName!,
      sName: v.sName || null,
      tName: v.tName || null,
      gender: v.gender as Gender,
      age: Number(v.age ?? 0),
      relation: v.relation!,
      communicationPhone: v.communicationPhone || null,
      description: v.description || null,
      government: v.government!,
      city: v.city!,
      street: v.street!,
      eventDate: v.eventDate!,
      primaryImage: media.primaryImage!,
      additionalImages: media.additionalImages.length ? media.additionalImages : null,
      video: media.video || null,
      policeReportImage: this.policeReport() || null,
    };
  }


  private getSubmissionDependencies(): CaseSubmissionFlowDeps<DuplicateDecisionPayload> {
    return {
      isSubmitting: this.isSubmitting,
      errorMsg: this.errorMsg,
      mediaErrors: this.mediaErrors,
      form: this.form,
      cacheService: this.cacheService,
      draftKey: LONG_TERM_CREATE_DRAFT_KEY,
      snackbar: this.snackbar,
      router: this.router,
      successRoute: ['/long-term'],
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
    this.router.navigate(['/long-term']);
  }
}
