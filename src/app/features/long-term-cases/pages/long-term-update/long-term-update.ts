import { useCaseMediaState } from '../../../../shared/helper/cases-helper/case-media.helper';
import { ImageService } from '../../../../shared/services/image.service';
import { CacheService } from '../../../../core/cache/cache.service';
import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  OnInit,
  DestroyRef,
  ViewChild,
  computed
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, Observable } from 'rxjs';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { CaseMediaUploaderComponent, CaseMediaPayload } from '../../../../shared/components/cases-components/case-media-uploader/case-media-uploader';

import { environment } from '../../../../../environments/environment';
import { LongTermCaseService } from '../../services/long-term-case.service';
import { LongTermCaseUpdateRequest } from '../../models/request/LongTermCaseUpdateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/dictionaries/relation.type.dictionary';
import {
  EGYPT_GOVERNORATES,
  getCitiesForGovernorate,
} from '../../../../core/constants/governorates';
import { SnackbarService } from '../../../../shared/services/toast.service';

import { FormField } from '../../../../shared/components/form-field/form-field';
import { CardComponent } from '../../../../shared/components/card/card';
import { CaseFormContainerComponent } from '../../../../shared/components/cases-components/case-form-container/case-form-container';

// Shared validators
import { useCaseFormErrors } from '../../../../shared/helper/cases-helper/case-form-errors.helper';
import { bindGovernorateCityValidation } from '../../../../shared/helper/cases-helper/case-location-sync.helper';
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { pastDate } from '../../../../shared/validators/past-date.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { validCity } from '../../../../shared/validators/city.validator';
import { validGovernorate } from '../../../../shared/validators/governorate.validator';
import { CaseFileResponse } from '../../../../core/models/cases.model';
import { UpdateFormSkeletonComponent } from '../../../../shared/components/skeletons/update-form-skeleton/update-form-skeleton.component';
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
import { CaseLocationDataComponent } from "../../../../shared/components/cases-components/case-location-data/case-location-data";
import { CasePersonDataComponent } from "../../../../shared/components/cases-components/case-person-data/case-person-data";


type Step = CaseFormStep;
export const LONG_TERM_UPDATE_DRAFT_KEY_PREFIX = 'LongTermUpdate_Draft_';

interface LongTermUpdateCustomData {
  primaryPhotoId: number | null;
  newPoliceReport: File | null;
}

@Component({
  selector: 'app-long-term-update',
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    FormField,
    CardComponent,
    UpdateFormSkeletonComponent,
    CaseMediaUploaderComponent,
    CaseFormContainerComponent,
    CaseLocationDataComponent,
    CasePersonDataComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./long-term-update.css'],
  templateUrl: './long-term-update.html',
})
export class LongTermUpdate implements OnInit {
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
  private service = inject(LongTermCaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackbar = inject(SnackbarService);
  private destroyRef = inject(DestroyRef);
  private cacheService = inject(CacheService);
  private imageService = inject(ImageService);

  @ViewChild(CaseMediaUploaderComponent) mediaUploader!: CaseMediaUploaderComponent;

  caseId!: number;
  currentStep = signal<Step>(1);
  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  private submittedSuccessfully = signal(false);

  showDeleteImageConfirm = signal(false);
  photoToDelete = signal<CaseFileResponse | null>(null);

  // Data loaded from backend
  existingPhotos = signal<CaseFileResponse[]>([]);
  existingPoliceReportUrl = signal<string | null>(null);
  existingVideoUrl = signal<string | null>(null);

  // Initial media state (for Cache restoration in Update mode)
  initialDeletedPhotoIds = signal<number[]>([]);
  initialPrimaryPhotoId = signal<number | null>(null);

  policeReport = signal<File | null>(null);
  policeReportPreview = signal<string | null>(null);

  // Active media state from the uploader

  // Media validation errors from backend

  get draftKey() {
    return `${LONG_TERM_UPDATE_DRAFT_KEY_PREFIX}${this.caseId}`;
  }

  readonly genders = Gender;
  readonly relationOptions = RELATION_TYPE_OPTIONS;
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

    saveUpdateDraft<any, LongTermUpdateCustomData>(
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
        newPoliceReport: this.policeReport(),
      }
    );
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

          const rawFiles: CaseFileResponse[] = c.photos ?? [];
          const files: CaseFileResponse[] = rawFiles.map((f) => ({
            ...f,
            imagePath: this.resolveMediaUrl(f.imagePath) ?? f.imagePath,
          }));
          this.existingPhotos.set(files);

          const primary = files.find((f) => f.isPrimary);

          this.existingPoliceReportUrl.set(this.resolveMediaUrl(c.policeReportImage ?? null));
          this.existingVideoUrl.set(this.resolveMediaUrl(c.video ?? null));

          const draft = restoreUpdateDraft<any, LongTermUpdateCustomData>(
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
            if (draft.newPoliceReport) this.policeReport.set(draft.newPoliceReport);

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

  // See LongTermCreate — every step control (including optional-but-validated ones)
  // must be checked, not just the required subset.
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
    const fields = this.stepControls[this.currentStep() as 1 | 2] ?? [];
    if (validateStepControls(this.form, fields)) return;
    this.currentStep.set(nextCaseFormStep(this.currentStep()));
    this.errorMsg.set(null);
  }

  prevStep(): void {
    this.currentStep.set(previousCaseFormStep(this.currentStep()));
  }

  /**
   * The backend (local FileStorageService) returns RELATIVE paths only
   * (e.g. "/Images/LongTermCase/xxx.jpg"), with no host attached.
   * Without prefixing environment.baseUrl, <img src> resolves against the
   * Angular app's own origin (localhost:4200) instead of the API
   * (localhost:7041) — which is exactly why photos looked broken/missing
   * even though the files physically exist on the API server.
   *
   * Kept forward-compatible: if the backend ever returns an absolute URL
   * (e.g. after migrating to S3), it's passed through untouched.
   */
  private resolveMediaUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${environment.filesBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  // ─────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.isSubmitting()) return;
    const media = this.mediaPayload();
    const currentRemainingPhotos = this.existingPhotos().length - media.deletedImageIds.length;
    const hasAtLeastOnePhoto =
      currentRemainingPhotos > 0 || !!media.primaryImage || media.additionalImages.length > 0;

    const validation = validateCaseSubmission(this.form, this.mediaUploader);
    let valid = validation.valid;

    if (!valid || !hasAtLeastOnePhoto) {
      if (!hasAtLeastOnePhoto) {
        this.errorMsg.set('لازم يفضل في صورة واحدة على الأقل للحالة.');
      } else {
        this.errorMsg.set(validation.message || 'يرجى مراجعة الأخطاء وتصحيحها.');
      }
      return;
    }

    const request = this.buildUpdateRequest();

    this.mediaErrors.set({});

    executeCaseSubmissionFlow(
      this.service.updateCase(this.caseId, request) as unknown as Observable<CaseSubmissionResponse<any>>,
      this.getSubmissionDependencies()
    );
  }

  private buildUpdateRequest(): LongTermCaseUpdateRequest {
    const v = this.form.getRawValue();
    const media = this.mediaPayload();

    return {
      fName: v.fName!,
      lName: v.lName!,
      sName: v.sName || null,
      tName: v.tName || null,
      gender: v.gender as Gender,
      age: v.age!,
      relation: v.relation as RelationType,
      communicationPhone: v.communicationPhone || null,
      description: v.description || null,
      government: v.government!,
      city: v.city!,
      street: v.street!,
      eventDate: v.eventDate!,
      primaryImage: media.primaryImage ?? undefined,
      newPhotos: media.additionalImages.length ? media.additionalImages : null,
      deletedPhotosIds: media.deletedImageIds.length ? media.deletedImageIds : null,
      primaryPhotoId: media.primaryPhotoId,
      video: media.video,
      policeReportImage: this.policeReport(),
    };
  }

  private getSubmissionDependencies(): CaseSubmissionFlowDeps<any> {
    return {
      isSubmitting: this.isSubmitting,
      errorMsg: this.errorMsg,
      mediaErrors: this.mediaErrors as any,
      form: this.form,
      cacheService: this.cacheService,
      draftKey: this.draftKey,
      snackbar: this.snackbar,
      router: this.router,
      successRoute: ['/long-term', String(this.caseId)],
      successMessage: 'تم تعديل بيانات الحالة بنجاح، وسيتم مراجعتها مرة أخرى من قِبَل الإدارة قبل النشر.',
      onSuccess: () => {
        this.submittedSuccessfully.set(true);
      },
      defaultErrorMessage: 'حدث خطأ أثناء حفظ التعديلات. حاول مرة أخرى.'
    };
  }

  goBack(): void {
    this.router.navigate(['/long-term', this.caseId]);
  }
}
