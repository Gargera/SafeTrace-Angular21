import { useCaseMediaState } from '../../../../shared/helper/cases-helper/case-media.helper';
import { CacheService } from '../../../../core/cache/cache.service';
import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
  DestroyRef,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, Observable } from 'rxjs';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { CaseFormContainerComponent } from '../../../../shared/components/cases-components/case-form-container/case-form-container';
import { CasePersonDataComponent } from '../../../../shared/components/cases-components/case-person-data/case-person-data';
import { CaseLocationDataComponent } from '../../../../shared/components/cases-components/case-location-data/case-location-data';
import { UnknownCaseService } from '../../services/unknown-case.service';
import { UnknownCaseUpdateRequest } from '../../models/request/UnknownCaseUpdateRequest';
import { Gender } from '../../../../shared/enums/gender';
import {
  EGYPT_GOVERNORATES,
  getCitiesForGovernorate,
} from '../../../../core/constants/governorates';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { CaseFileResponse } from '../../../../core/models/cases.model';
import { CardComponent } from '../../../../shared/components/card/card';

// Shared validators
import { useCaseFormErrors } from '../../../../shared/helper/cases-helper/case-form-errors.helper';
import { bindGovernorateCityValidation } from '../../../../shared/helper/cases-helper/case-location-sync.helper';
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { validCity } from '../../../../shared/validators/city.validator';
import { validGovernorate } from '../../../../shared/validators/governorate.validator';

import { CommonModule } from '@angular/common';
import { UpdateFormSkeletonComponent } from '../../../../shared/components/skeletons/update-form-skeleton/update-form-skeleton.component';
import { CaseMediaUploaderComponent, CaseMediaPayload } from '../../../../shared/components/cases-components/case-media-uploader/case-media-uploader';
import {
  CaseFormStep,
  localDateInputValue,
  nextCaseFormStep,
  previousCaseFormStep,
  validateStepControls,
  validateCaseSubmission,
} from '../../../../shared/helper/cases-helper/case-form.helper';
import { executeCaseSubmissionFlow, CaseSubmissionResponse, CaseSubmissionFlowDeps } from '../../../../shared/helper/cases-helper/case-submission-flow.helper';
import { saveUpdateDraft, restoreUpdateDraft } from '../../../../shared/helper/cases-helper/case-cache.helper';

type Step = CaseFormStep;
export const UNKNOWN_UPDATE_DRAFT_KEY_PREFIX = 'UnknownUpdate_Draft_';

interface UnknownUpdateCustomData {
  primaryPhotoId: number | null;
}

@Component({
  selector: 'app-unknown-update',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CaseMediaUploaderComponent,
    CaseFormContainerComponent,
    CasePersonDataComponent,
    CaseLocationDataComponent,
    CardComponent,
    UpdateFormSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./unknown-update.css'],
  templateUrl: './unknown-update.html',
})
export class UnknownUpdate implements OnInit {
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

  private fb = inject(FormBuilder);
  private service = inject(UnknownCaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackbar = inject(SnackbarService);
  private destroyRef = inject(DestroyRef);
  private cacheService = inject(CacheService);

  mediaUploader = viewChild<CaseMediaUploaderComponent>(CaseMediaUploaderComponent);

  caseId!: number;
  currentStep = signal<Step>(1);
  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  private submittedSuccessfully = signal(false);

  existingPhotos = signal<CaseFileResponse[]>([]);
  existingVideoUrl = signal<string | null>(null);

  // Initial media state (for Cache restoration in Update mode)
  initialDeletedPhotoIds = signal<number[]>([]);
  initialPrimaryPhotoId = signal<number | null>(null);

  get draftKey() {
    return `${UNKNOWN_UPDATE_DRAFT_KEY_PREFIX}${this.caseId}`;
  }

  readonly genders = Gender;
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
          title: 'تحديث بيانات المفقود',
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

  // ─────────────────────────────────────────────────────────────
  // Error message helpers
  // ─────────────────────────────────────────────────────────────
  private formErrors = useCaseFormErrors(this.form);
  getFieldError = this.formErrors.getFieldError;
  isInvalid = this.formErrors.isInvalid;
  isInvalidFn = this.formErrors.isInvalidFn;
  getErrorFn = this.formErrors.getErrorFn;

  availableCities = signal<string[]>([]);

  ngOnInit(): void {
    this.caseId = Number(this.route.snapshot.paramMap.get('id'));

    bindGovernorateCityValidation(this.form, this.destroyRef, this.availableCities);

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef), debounceTime(500))
      .subscribe(() => {
        this.saveDraft();
      });

    this.loadCase();
  }

  private saveDraft(media?: CaseMediaPayload): void {
    if (this.isLoading() || this.submittedSuccessfully()) return;

    const payload = media ?? this.mediaPayload();

    saveUpdateDraft<any, UnknownUpdateCustomData>(
      this.cacheService,
      this.draftKey,
      this.form,
      this.currentStep(),
      {
        primaryImage: payload.primaryImage,
        additionalImages: payload.additionalImages,
        deletedImageIds: payload.deletedImageIds,
        video: payload.video,
      },
      {
        primaryPhotoId: payload.primaryPhotoId,
      }
    );
  }

  /**
   * The backend returns RELATIVE paths only.
   */
  private resolveMediaUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${environment.filesBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private loadCase(): void {
    this.isLoading.set(true);
    this.service
      .getMyCaseById(this.caseId)
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
            fName: c.fName || '',
            sName: c.sName || '',
            tName: c.tName || '',
            lName: c.lName || '',
            age: c.age,
            gender: c.gender as Gender,
            communicationPhone: c.communicationPhone,
            description: c.description,
            government: c.government,
            city: c.city,
            street: c.street,
            eventDate: c.eventDate ? c.eventDate.substring(0, 10) : '',
          });

          const rawFiles: CaseFileResponse[] = c.photos ?? [];
          const files: CaseFileResponse[] = rawFiles.map((f) => ({
            ...f,
            imagePath: this.resolveMediaUrl(f.imagePath) ?? f.imagePath,
          }));
          const primary = files.find((f) => f.isPrimary);

          this.existingPhotos.set(files);
          this.existingVideoUrl.set(this.resolveMediaUrl(c.video ?? null));

          const draft = restoreUpdateDraft<any, UnknownUpdateCustomData>(
            this.cacheService,
            this.draftKey,
            this.form,
            (s) => this.currentStep.set(s),
            {
              primary: (f) => this.initialPrimary.set(f),
              additional: (fs) => this.initialAdditional.set(fs),
              deletedPhotoIds: (ids) => this.initialDeletedPhotoIds.set(ids),
              video: (f) => this.initialVideo.set(f)
            }
          );

          if (draft) {
            const pId = draft.primaryPhotoId ?? (primary ? primary.id : (files[0]?.id ?? null));
            this.mediaPayload.set({
              primaryImage: draft.newPrimaryImage ?? null,
              additionalImages: draft.newAdditionalImages ?? [],
              deletedImageIds: draft.deletedPhotoIds ?? [],
              video: draft.newVideo ?? null,
              primaryPhotoId: pId,
            });
            this.initialPrimaryPhotoId.set(pId);
          } else {
            const pId = primary ? primary.id : (files[0]?.id ?? null);
            this.mediaPayload.update((p: CaseMediaPayload) => ({
              ...p,
              primaryPhotoId: pId
            }));
            this.initialPrimaryPhotoId.set(pId);
          }

          this.isLoading.set(false);
        },
        error: (err: unknown) => {
          this.isLoading.set(false);
          const msg = extractErrorMessage(err, 'تعذر تحميل بيانات الحالة.');
          this.errorMsg.set(msg);
        },
      });
  }

  private readonly stepControls: Record<1 | 2, string[]> = {
    1: ['fName', 'sName', 'tName', 'lName', 'age', 'gender', 'communicationPhone', 'description'],
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

  onSubmit(): void {
    if (this.isSubmitting()) return;
    const media = this.mediaPayload();
    const currentRemainingPhotos = this.existingPhotos().length - media.deletedImageIds.length;
    const hasAtLeastOnePhoto =
      currentRemainingPhotos > 0 || !!media.primaryImage || media.additionalImages.length > 0;

    const uploader = this.mediaUploader();
    if (uploader) {
      const validation = validateCaseSubmission(this.form, uploader);
      if (!validation.valid || !hasAtLeastOnePhoto) {
        if (!hasAtLeastOnePhoto) {
          this.errorMsg.set('لازم يفضل في صورة واحدة على الأقل للحالة.');
        } else {
          this.errorMsg.set(validation.message!);
        }
        return;
      }
    }

    const request = this.buildUpdateRequest();

    this.mediaErrors.set({});

    executeCaseSubmissionFlow(
      this.service.updateCase(this.caseId, request) as unknown as Observable<CaseSubmissionResponse<any>>,
      this.getSubmissionDependencies()
    );
  }

  private buildUpdateRequest(): UnknownCaseUpdateRequest {
    const v = this.form.getRawValue();
    const media = this.mediaPayload();

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
      primaryImage: media.primaryImage ?? undefined,
      newPhotos: media.additionalImages.length ? media.additionalImages : null,
      deletedPhotosIds: media.deletedImageIds.length ? media.deletedImageIds : null,
      primaryPhotoId: media.primaryPhotoId,
      video: media.video,
    };
  }

  private getSubmissionDependencies(): CaseSubmissionFlowDeps<any> {
    return {
      isSubmitting: this.isSubmitting,
      errorMsg: this.errorMsg,
      mediaErrors: this.mediaErrors,
      form: this.form,
      cacheService: this.cacheService,
      draftKey: this.draftKey,
      snackbar: this.snackbar,
      router: this.router,
      successRoute: ['/unknown', String(this.caseId)],
      successMessage: 'تم تحديث بيانات الحالة بنجاح.',
      onSuccess: () => {
        this.submittedSuccessfully.set(true);
      },
      defaultErrorMessage: 'حدث خطأ أثناء حفظ التعديلات. حاول مرة أخرى.'
    };
  }

  goBack(): void {
    this.router.navigate(['/unknown']);
  }
}
