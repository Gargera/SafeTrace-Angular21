import { useCaseMediaState } from '../../../../shared/helper/cases-helper/case-media.helper';
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
import { debounceTime } from 'rxjs';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CaseMediaUploaderComponent } from '../../../../shared/components/cases-components/case-media-uploader/case-media-uploader';
import { CaseFormContainerComponent } from '../../../../shared/components/cases-components/case-form-container/case-form-container';
import { UrgentCaseService } from '../../services/urgent-case.service';
import { UrgentCaseCreateRequest } from '../../models/request/UrgentCaseCreateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { CaseType } from '../../../../shared/enums/case-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/dictionaries/relation.type.dictionary';
import {
  EGYPT_GOVERNORATES,
} from '../../../../core/constants/governorates';
import { MapLocationPickerComponent } from '../../../../shared/components/map-location-picker/components/map-location-picker';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ForceCreatePopupComponent } from '../../../../shared/components/cases-components/force-create-popup/force-create-popup.component';
import { MatchedCaseResponse } from '../../../../core/models/cases.model';
import { DuplicateDecision } from '../../../../shared/enums/duplicate-decision';
import { DuplicateInfoDialogComponent } from '../../../../shared/components/cases-components/duplicate-info-dialog/duplicate-info-dialog.component';
import { GeocodingService } from '../../../../core/services/geocoding/geocoding.service';

import { useCaseFormErrors } from '../../../../shared/helper/cases-helper/case-form-errors.helper';
import { bindGovernorateCityValidation } from '../../../../shared/helper/cases-helper/case-location-sync.helper';
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import {
  urgentEventDate,
  toDatetimeLocalString,
  URGENT_EVENT_MAX_AGE_HOURS,
} from '../../../../shared/validators/urgent-event-date.validator';
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
import { DuplicateDecisionPayload } from '../../../../shared/helper/cases-helper/case-duplicate.helper';
import { useCaseDuplicateHandler } from '../../../../shared/helper/cases-helper/case-duplicate-handler.helper';
import { executeCaseSubmissionFlow, CaseSubmissionFlowDeps } from '../../../../shared/helper/cases-helper/case-submission-flow.helper';
import { saveCreateDraft, restoreCreateDraft, CreateDraft } from '../../../../shared/helper/cases-helper/case-cache.helper';
import { CaseLocationDataComponent } from "../../../../shared/components/cases-components/case-location-data/case-location-data";
import { CasePersonDataComponent } from "../../../../shared/components/cases-components/case-person-data/case-person-data";

type Step = CaseFormStep;

export const URGENT_CREATE_DRAFT_KEY = 'UrgentCreate_Draft';

interface UrgentCreateCustomData {
  showForceCreatePopup: boolean;
  showDuplicateInfoDialog: boolean;
  currentDuplicateDecision: DuplicateDecision;
  isBlockedDuplicate: boolean;
  matchedCases: MatchedCaseResponse[];
  existingCaseType: CaseType | null;
  selectedLat: number | null;
  selectedLng: number | null;
  selectedAddress: string;
  isMapModalOpen: boolean;
}

interface UrgentCreateFormValue {
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
  selector: 'app-urgent-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MapLocationPickerComponent,
    CaseFormContainerComponent,
    CaseMediaUploaderComponent,
    ForceCreatePopupComponent,
    DuplicateInfoDialogComponent,
    CaseLocationDataComponent,
    CasePersonDataComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./urgent-create.css'],
  templateUrl: './urgent-create.html',
})
export class UrgentCreate implements OnInit {
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private cacheService = inject(CacheService);

  mediaUploader = viewChild<CaseMediaUploaderComponent>(
    CaseMediaUploaderComponent
  );

  // Allowed datetime range for urgent cases (last 24 hours)
  readonly minEventDate = computed(() => {
    const now = new Date();
    const limitAgo = new Date(now.getTime() - URGENT_EVENT_MAX_AGE_HOURS * 60 * 60 * 1000);
    return toDatetimeLocalString(limitAgo);
  });

  readonly maxEventDate = computed(() => {
    const now = new Date();
    return toDatetimeLocalString(now);
  });
  private service = inject(UrgentCaseService);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);
  private geocoding = inject(GeocodingService);

  currentStep = signal<Step>(1);
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  // Initial media state (for Cache restoration)

  // Active media state from the uploader

  selectedLat = signal<number | null>(null);
  selectedLng = signal<number | null>(null);
  selectedAddress = signal<string>('');
  externalLocation = signal<{ lat: number; lng: number } | null>(null);
  isMapModalOpen = signal(false);

  isLocating = signal(false);
  locationError = signal<string | null>(null);

  private pendingRequest = signal<UrgentCaseCreateRequest | null>(null);

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
    { num: 2, label: 'موقع الحادث' },
    { num: 3, label: 'مستندات وصور' },
  ];

  stepTitle = computed(() => {
    return ['بيانات الشخص المفقود', 'موقع الحادث على الخريطة', 'مستندات وصور'][this.currentStep() - 1];
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
  // Form definition — validators match backend exactly
  // ─────────────────────────────────────────────────────────────
  form = this.fb.nonNullable.group({
    fName: [
      '',
      [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(60)],
    ],
    sName: this.fb.control<string | null>(null, [arabicText(), Validators.minLength(2), Validators.maxLength(60)]),
    tName: this.fb.control<string | null>(null, [arabicText(), Validators.minLength(2), Validators.maxLength(60)]),
    lName: [
      '',
      [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(60)],
    ],
    age: this.fb.control<number | null>(null, [Validators.required, Validators.min(1), Validators.max(120)]),
    gender: this.fb.control<Gender | null>(null, [Validators.required, validEnum(Gender)]),
    relation: this.fb.control<RelationType | null>(null, [Validators.required, validEnum(RelationType)]),
    communicationPhone: this.fb.control<string | null>(null, [egyptianPhone(), Validators.maxLength(15)]),
    description: this.fb.control<string | null>(null, [Validators.maxLength(2000)]),
    government: [
      '',
      [Validators.required, validGovernorate(), Validators.minLength(2), Validators.maxLength(100)],
    ],
    city: ['', [Validators.required]],
    street: ['', [Validators.required, Validators.maxLength(200)]],
    eventDate: ['', [Validators.required, urgentEventDate()]],
  });

  // ─────────────────────────────────────────────────────────────
  // Error message helpers
  // ─────────────────────────────────────────────────────────────
  private formErrors = useCaseFormErrors(this.form);
  getFieldError = this.formErrors.getFieldError;
  isInvalid = this.formErrors.isInvalid;
  isInvalidFn = this.formErrors.isInvalidFn;
  getErrorFn = this.formErrors.getErrorFn;

  onLocationChange(loc: { lat: number; lng: number; address: string }): void {

    this.selectedLat.set(loc.lat);
    this.selectedLng.set(loc.lng);
    this.selectedAddress.set(loc.address);

    if (this.hasValidLocation()) {
      this.errorMsg.set(null);
      this.locationError.set(null);
    }

    this.saveDraft();
  }

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
    saveCreateDraft<UrgentCreateFormValue, UrgentCreateCustomData>(
      this.cacheService,
      URGENT_CREATE_DRAFT_KEY,
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
        selectedLat: this.selectedLat(),
        selectedLng: this.selectedLng(),
        selectedAddress: this.selectedAddress(),
        isMapModalOpen: this.isMapModalOpen(),
      }
    );
  }

  ngOnInit(): void {
    bindGovernorateCityValidation(this.form, this.destroyRef, this.availableCities);

    const draft = restoreCreateDraft<UrgentCreateFormValue, UrgentCreateCustomData>(
      this.cacheService,
      URGENT_CREATE_DRAFT_KEY,
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
      this.showForceCreatePopup.set(draft.showForceCreatePopup ?? false);
      this.showDuplicateInfoDialog.set(draft.showDuplicateInfoDialog ?? false);
      this.currentDuplicateDecision.set(draft.currentDuplicateDecision ?? DuplicateDecision.None);
      this.isBlockedDuplicate.set(draft.isBlockedDuplicate ?? false);
      this.matchedCases.set(draft.matchedCases ?? []);
      this.existingCaseType.set(draft.existingCaseType ?? null);

      if (draft.selectedLat !== null && draft.selectedLat !== undefined && draft.selectedLng !== null && draft.selectedLng !== undefined) {
        this.selectedLat.set(draft.selectedLat);
        this.selectedLng.set(draft.selectedLng);
        this.selectedAddress.set(draft.selectedAddress ?? '');
        this.externalLocation.set({ lat: draft.selectedLat, lng: draft.selectedLng });
      }

      this.isMapModalOpen.set(draft.isMapModalOpen ?? false);

      this.restoreMediaFromDraft(draft);
    }
  }

  private restoreMediaFromDraft(draft: CreateDraft<UrgentCreateFormValue> & UrgentCreateCustomData): void {
    this.mediaPayload.set({
      primaryImage: draft.newPrimaryImage ?? null,
      additionalImages: draft.newAdditionalImages ?? [],
      video: draft.newVideo ?? null,
      deletedImageIds: [],
      primaryPhotoId: null,
      originalPrimaryImage: draft.originalPrimaryImage ?? null
    });
  }

  openMapModal(): void {
    this.isMapModalOpen.set(true);
  }

  closeMapModal(): void {
    this.isMapModalOpen.set(false);
  }

  onMapLocationConfirmed(loc: { lat: number; lng: number; address: string }): void {
    this.selectedLat.set(loc.lat);
    this.selectedLng.set(loc.lng);
    this.selectedAddress.set(loc.address);
    this.externalLocation.set({ lat: loc.lat, lng: loc.lng });
    this.isMapModalOpen.set(false);

    if (this.hasValidLocation()) {
      this.errorMsg.set(null);
      this.locationError.set(null);
    }

    this.saveDraft();
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.locationError.set('المتصفح لا يدعم تحديد الموقع الجغرافي.');
      return;
    }

    this.isLocating.set(true);
    this.locationError.set(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.geocoding
          .reverseGeocode(lat, lng)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (address) => {
              this.onLocationChange({ lat, lng, address });
              this.isLocating.set(false);
            },
            error: () => {
              this.onLocationChange({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
              this.isLocating.set(false);
            },
          });
      },
      (error: GeolocationPositionError) => {
        this.isLocating.set(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError.set(
              'تم رفض إذن الوصول لموقعك. من فضلك فعّل صلاحية الموقع من إعدادات المتصفح.',
            );
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError.set('تعذر تحديد موقعك الحالي.');
            break;
          case error.TIMEOUT:
            this.locationError.set('انتهت مهلة تحديد الموقع، حاول مرة أخرى.');
            break;
          default:
            this.locationError.set('حدث خطأ أثناء تحديد الموقع.');
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  }

  private readonly stepControls: Partial<Record<CaseFormStep, string[]>> = {
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

  private hasValidLocation(): boolean {
    return this.selectedLat() !== null && this.selectedLng() !== null;
  }

  nextStep(): void {
    const current = this.currentStep();
    const fields = this.stepControls[current] ?? [];
    if (validateStepControls(this.form, fields)) return;

    if (current === 2) {
      if (!this.hasValidLocation()) {
        this.errorMsg.set('من فضلك حدد موقع الحادث على الخريطة.');
        return;
      }
    }

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
      if (!this.hasValidLocation()) {
        this.errorMsg.set('من فضلك حدد موقع الحادث على الخريطة.');
        return;
      }
    }

    let request: UrgentCaseCreateRequest;
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
      draftKey: URGENT_CREATE_DRAFT_KEY,
      snackbar: this.snackbar,
      router: this.router,
      successRoute: ['/urgent'],
      successMessage: 'تم إرسال البلاغ العاجل ونشره فورًا دون الحاجة لمراجعة الإدارة.',
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
    this.router.navigate(['/urgent']);
  }

  private buildCreateRequest(): UrgentCaseCreateRequest | null {
    const v: UrgentCreateFormValue = this.form.getRawValue();
    const media = this.mediaPayload();

    const primaryImage =
      media.primaryImage !== undefined
        ? media.primaryImage
        : this.initialPrimary();

    const additionalImages =
      media.additionalImages !== undefined
        ? media.additionalImages
        : this.initialAdditional();

    const video =
      media.video !== undefined
        ? media.video
        : this.initialVideo();

    const lat = this.selectedLat();
    const lng = this.selectedLng();

    if (!this.hasValidLocation() || lat === null || lng === null) {
      this.errorMsg.set('من فضلك حدد موقع الحادث على الخريطة.');
      return null;
    }

    if (!primaryImage) {
      this.errorMsg.set('يرجى إعادة إرفاق الصورة الأساسية قبل المتابعة.');
      return null;
    }

    if (!v.gender || !v.relation || !v.age) {
      return null;
    }

    return {
      fName: v.fName,
      lName: v.lName,
      sName: v.sName,
      tName: v.tName,
      gender: v.gender,
      age: v.age,
      relation: v.relation,
      communicationPhone: v.communicationPhone,
      description: v.description,
      government: v.government,
      city: v.city,
      street: v.street,
      eventDate: v.eventDate,
      primaryImage: primaryImage,
      additionalImages: additionalImages.length ? additionalImages : null,
      video: video ?? null,
      latitude: lat,
      longitude: lng,
    };
  }

}
