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
import { UrgentCaseService } from '../../services/urgent-case.service';
import { UrgentCaseUpdateRequest } from '../../models/request/UrgentCaseUpdateRequest';
import { Gender } from '../../../../shared/enums/gender';
import { RelationType } from '../../../../shared/enums/relation-type';
import { RELATION_TYPE_OPTIONS } from '../../../../core/constants/dictionaries/relation.type.dictionary';
import {
  EGYPT_GOVERNORATES,
  getCitiesForGovernorate,
} from '../../../../core/constants/governorates';
import { MapLocationPickerComponent } from '../../../../shared/components/map-location-picker/components/map-location-picker';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { CardComponent } from '../../../../shared/components/card/card';
import { CaseFormContainerComponent } from '../../../../shared/components/cases-components/case-form-container/case-form-container';

// Shared validators
import { useCaseFormErrors } from '../../../../shared/helper/cases-helper/case-form-errors.helper';
import { bindGovernorateCityValidation } from '../../../../shared/helper/cases-helper/case-location-sync.helper';
import { arabicText } from '../../../../shared/validators/arabic-text.validator';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { validEnum } from '../../../../shared/validators/enum.validator';
import { validCity } from '../../../../shared/validators/city.validator';
import { validGovernorate } from '../../../../shared/validators/governorate.validator';
import { CaseMediaUploaderComponent, CaseMediaPayload } from '../../../../shared/components/cases-components/case-media-uploader/case-media-uploader';

import { CommonModule } from '@angular/common';
import { GeocodingService } from '../../../../core/services/geocoding/geocoding.service';
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
import { toDatetimeLocalString } from '../../../../shared/validators/urgent-event-date.validator';
import { CaseLocationDataComponent } from "../../../../shared/components/cases-components/case-location-data/case-location-data";
import { CasePersonDataComponent } from "../../../../shared/components/cases-components/case-person-data/case-person-data";

type Step = CaseFormStep;

export const URGENT_UPDATE_DRAFT_KEY_PREFIX = 'UrgentUpdate_Draft_';

interface UrgentUpdateCustomData {
  selectedLat: number | null;
  selectedLng: number | null;
  selectedAddress: string;
  isMapModalOpen: boolean;
}

@Component({
  selector: 'app-urgent-update',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MapLocationPickerComponent,
    CardComponent,
    UpdateFormSkeletonComponent,
    CaseMediaUploaderComponent,
    CaseFormContainerComponent,
    CaseLocationDataComponent,
    CasePersonDataComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./urgent-update.css'],
  templateUrl: './urgent-update.html',
})
export class UrgentUpdate implements OnInit {
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
  initialDeletedPhotoIds = this.mediaState.initialDeletedPhotoIds;
  initialPrimaryPhotoId = this.mediaState.initialPrimaryPhotoId;
  initialExistingVideoDeleted = this.mediaState.initialExistingVideoDeleted;
  mediaPayload = this.mediaState.mediaPayload;
  mediaErrors = this.mediaState.mediaErrors;
  onMediaChange = this.mediaState.onMediaChange;

  clearMediaError(field: 'primary' | 'additional' | 'video'): void {
    this.mediaErrors.update((errors: any) => ({
      ...errors,
      [field]: null
    }));
  }

  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private cacheService = inject(CacheService);

  mediaUploader = viewChild<CaseMediaUploaderComponent>(CaseMediaUploaderComponent);

  private service = inject(UrgentCaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackbar = inject(SnackbarService);
  private geocoding = inject(GeocodingService);

  caseId!: number;
  currentStep = signal<Step>(1);
  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  private submittedSuccessfully = signal(false);

  existingPhotos = signal<CaseFileResponse[]>([]);
  existingVideoUrl = signal<string | null>(null);

  get draftKey() {
    return `${URGENT_UPDATE_DRAFT_KEY_PREFIX}${this.caseId}`;
  }

  selectedLat = signal<number | null>(null);
  selectedLng = signal<number | null>(null);
  selectedAddress = signal<string>('');
  initialMapCenter = signal<{ lat: number; lng: number } | null>(null);
  isMapModalOpen = signal(false);
  private originalEventDate = signal<string>('');
  eventDateDisplay = signal<string>('');

  isLocating = signal(false);
  locationError = signal<string | null>(null);

  readonly genders = Gender;
  readonly relationOptions = RELATION_TYPE_OPTIONS;
  readonly governorates = EGYPT_GOVERNORATES;
  readonly today = localDateInputValue();

  readonly steps = [
    { num: 1, label: 'بيانات الشخص' },
    { num: 2, label: 'موقع الحادث' },
    { num: 3, label: 'مستندات وصور' },
  ];

  stepTitle = computed(() => {
    return ['بيانات الشخص المفقود', 'موقع الحادث على الخريطة', 'المستندات والصور'][this.currentStep() - 1];
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

    // Set city validator after form is initialized to avoid circular reference
    bindGovernorateCityValidation(this.form, this.destroyRef, this.availableCities);

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef), debounceTime(500))
      .subscribe(() => {
        this.saveDraftToCache();
      });

    this.loadCase();
  }

  private saveDraftToCache(media?: CaseMediaPayload): void {
    if (this.isLoading() || this.submittedSuccessfully()) return;

    const payload = media ?? this.mediaPayload();

    saveUpdateDraft<any, UrgentUpdateCustomData>(
      this.cacheService,
      this.draftKey,
      this.form,
      this.currentStep(),
      {
        primaryImage: payload.primaryImage,
        additionalImages: payload.additionalImages,
        deletedImageIds: payload.deletedImageIds,
        video: payload.video,
        isExistingVideoDeleted: payload.isExistingVideoDeleted,
        primaryPhotoId: payload.primaryPhotoId,
        originalPrimaryImage: payload.originalPrimaryImage,
      },
      {
        selectedLat: this.selectedLat(),
        selectedLng: this.selectedLng(),
        selectedAddress: this.selectedAddress(),
        isMapModalOpen: this.isMapModalOpen(),
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
          });
          this.originalEventDate.set(c.eventDate ?? '');
          this.eventDateDisplay.set(
            c.eventDate ? toDatetimeLocalString(new Date(c.eventDate)) : '',
          );

          if (c.latitude != null && c.longitude != null) {
            this.selectedLat.set(c.latitude);
            this.selectedLng.set(c.longitude);
            this.initialMapCenter.set({ lat: c.latitude, lng: c.longitude });
            this.geocoding
              .reverseGeocode(c.latitude, c.longitude)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (addr) => this.selectedAddress.set(addr),
                error: () =>
                  this.selectedAddress.set(`${c.latitude!.toFixed(4)}, ${c.longitude!.toFixed(4)}`),
              });
          }

          const rawFiles: CaseFileResponse[] = c.photos ?? [];
          const files: CaseFileResponse[] = rawFiles.map((f) => ({
            ...f,
            imagePath: this.resolveMediaUrl(f.imagePath) ?? f.imagePath,
          }));

          const primary = files.find((f) => f.isPrimary);

          this.existingVideoUrl.set(this.resolveMediaUrl(c.video ?? null));

          const draft = restoreUpdateDraft<any, UrgentUpdateCustomData>(
            this.cacheService,
            this.draftKey,
            this.form,
            (s) => this.currentStep.set(s),
            {
              primary: (f) => this.initialPrimary.set(f),
              originalPrimary: (f) => this.initialOriginalPrimary.set(f),
              additional: (fs) => this.initialAdditional.set(fs),
              deletedPhotoIds: (ids) => this.initialDeletedPhotoIds.set(ids),
              video: (f) => this.initialVideo.set(f),
              primaryPhotoId: (id) => this.initialPrimaryPhotoId.set(id),
              isExistingVideoDeleted: (deleted) => this.initialExistingVideoDeleted.set(deleted),
            }
          );

          if (draft) {
            if (draft.selectedLat !== null && draft.selectedLat !== undefined && draft.selectedLng !== null && draft.selectedLng !== undefined) {
              this.selectedLat.set(draft.selectedLat);
              this.selectedLng.set(draft.selectedLng);
              this.selectedAddress.set(draft.selectedAddress);
              this.initialMapCenter.set({ lat: draft.selectedLat, lng: draft.selectedLng });
            }
            if (draft.isMapModalOpen) {
              this.isMapModalOpen.set(true);
            }

            // Important: we need to set the payload so that we don't have to wait for the uploader to emit it
            const deletedPhotoIds = draft.deletedPhotoIds ?? [];
            const restoredPrimaryId = draft.primaryPhotoId !== undefined
              ? draft.primaryPhotoId
              : (primary?.id ?? null);
            const pId = restoredPrimaryId !== null && !deletedPhotoIds.includes(restoredPrimaryId)
              ? restoredPrimaryId
              : null;
            const isExistingVideoDeleted =
              draft.isExistingVideoDeleted ?? draft.removedVideo ?? false;
            this.mediaPayload.set({
              primaryImage: draft.newPrimaryImage ?? null,
              additionalImages: draft.newAdditionalImages ?? [],
              deletedImageIds: deletedPhotoIds,
              video: draft.newVideo ?? null,
              isExistingVideoDeleted,
              primaryPhotoId: pId,
              originalPrimaryImage: draft.originalPrimaryImage ?? null,
            });
            this.initialPrimaryPhotoId.set(pId);
            this.initialExistingVideoDeleted.set(isExistingVideoDeleted);

          } else {
            const pId = primary?.id ?? null;
            this.mediaPayload.update((p: CaseMediaPayload) => ({
              ...p,
              primaryPhotoId: pId
            }));
            this.initialPrimaryPhotoId.set(pId);
          }
          this.existingPhotos.set(files);

          this.isLoading.set(false);
        },
        error: (err: unknown) => {
          this.isLoading.set(false);
          const msg = extractErrorMessage(err, 'تعذر تحميل بيانات الحالة.');
          this.errorMsg.set(msg);
        },
      });
  }

  onLocationChange(loc: { lat: number; lng: number; address: string }): void {
    this.selectedLat.set(loc.lat);
    this.selectedLng.set(loc.lng);
    this.selectedAddress.set(loc.address);
    this.saveDraftToCache();
  }

  openMapModal(): void {
    this.isMapModalOpen.set(true);
    this.saveDraftToCache();
  }

  closeMapModal(): void {
    this.isMapModalOpen.set(false);
    this.saveDraftToCache();
  }

  onMapLocationConfirmed(loc: { lat: number; lng: number; address: string }): void {
    this.selectedLat.set(loc.lat);
    this.selectedLng.set(loc.lng);
    this.selectedAddress.set(loc.address);
    this.initialMapCenter.set({ lat: loc.lat, lng: loc.lng });
    this.isMapModalOpen.set(false);
    this.saveDraftToCache();
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
    2: ['government', 'city', 'street'],
  };

  nextStep(): void {
    const current = this.currentStep();
    const fields = this.stepControls[current as 1 | 2] ?? [];
    if (validateStepControls(this.form, fields)) return;

    if (current === 2) {
      if (this.selectedLat() === null || this.selectedLng() === null) {
        this.locationError.set('من فضلك حدد موقع الحادث على الخريطة.');
        return;
      }
    }
    this.currentStep.set(nextCaseFormStep(current));
  }

  prevStep(): void {
    this.currentStep.set(previousCaseFormStep(this.currentStep()));
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;
    const media = this.mediaPayload();
    const existingPrimaryRemains =
      media.primaryPhotoId !== null &&
      !media.deletedImageIds.includes(media.primaryPhotoId) &&
      this.existingPhotos().some(
        (photo) => photo.id === media.primaryPhotoId && photo.isPrimary
      );
    const hasPrimaryImage = !!media.primaryImage || existingPrimaryRemains;

    const uploader = this.mediaUploader();
    const validation = validateCaseSubmission(this.form, uploader);
    if (!validation.valid || !hasPrimaryImage || this.selectedLat() === null) {
      if (!hasPrimaryImage) this.mediaErrors.set({ primary: 'الصورة الأساسية مطلوبة.' });
      else if (this.selectedLat() === null) this.locationError.set('من فضلك حدد موقع الحادث على الخريطة.');
      else this.errorMsg.set(validation.message!);
      return;
    }

    const request = this.buildUpdateRequest();

    this.mediaErrors.set({});

    executeCaseSubmissionFlow(
      this.service.updateCase(this.caseId, request) as unknown as Observable<CaseSubmissionResponse<any>>,
      this.getSubmissionDependencies()
    );
  }

  private buildUpdateRequest(): UrgentCaseUpdateRequest {
    const v = this.form.getRawValue();
    const media = this.mediaPayload();

    return {
      fName: v.fName!,
      lName: v.lName!,
      sName: v.sName || null,
      tName: v.tName || null,
      gender: v.gender as Gender,
      age: Number(v.age ?? 0),
      relation: v.relation as RelationType,
      communicationPhone: v.communicationPhone || null,
      description: v.description || null,
      government: v.government!,
      city: v.city!,
      street: v.street!,
      eventDate: this.originalEventDate(),
      primaryImage: media.primaryImage ?? null,
      newPhotos: media.additionalImages.length ? media.additionalImages : null,
      isExistingVideoDeleted: media.isExistingVideoDeleted ?? false,
      deletedPhotoIds: media.deletedImageIds.length ? media.deletedImageIds : null,
      video: media.video,
      latitude: this.selectedLat()!,
      longitude: this.selectedLng()!,
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
      successRoute: ['/urgent/my', this.caseId],
      successMessage: 'تم تعديل بيانات الحالة بنجاح.',
      onSuccess: () => {
        this.submittedSuccessfully.set(true);
      },
      defaultErrorMessage: 'حدث خطأ أثناء حفظ التعديلات. حاول مرة أخرى.'
    };
  }

  goBack(): void {
    this.router.navigate(['/urgent', this.caseId]);
  }
}
