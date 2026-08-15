import { CacheService } from '../../../core/cache/cache.service';
import { CACHE_TTL, CACHE_TAGS } from '../../../core/cache/cache.constants';
import { FormGroup } from '@angular/forms';
import { CaseFormStep, UpdateDraft } from './case-form.helper';

export interface CreateDraft<T = unknown> {
  formValue: T;
  currentStep: CaseFormStep;
  newPrimaryImage?: File | null;
  newAdditionalImages?: File[];
  newVideo?: File | null;
  primaryPhotoId?: number | null;
  originalPrimaryImage?: File | null;
}

export interface CaseMediaPayload {
  primaryImage?: File | null;
  additionalImages?: File[];
  video?: File | null;
  deletedImageIds?: number[];
  removedVideo?: boolean;
  primaryPhotoId?: number | null;
  originalPrimaryImage?: File | null;
}

export function saveCreateDraft<T, S = {}>(
  cacheService: CacheService,
  key: string,
  form: FormGroup,
  currentStep: CaseFormStep,
  mediaPayload?: CaseMediaPayload,
  caseSpecificData?: S
): void {
  const draft = {
    ...caseSpecificData,
    formValue: form.getRawValue(),
    currentStep,
    newPrimaryImage: mediaPayload?.primaryImage ?? null,
    newAdditionalImages: mediaPayload?.additionalImages ?? [],
    newVideo: mediaPayload?.video,
    primaryPhotoId: mediaPayload?.primaryPhotoId,
    originalPrimaryImage: mediaPayload?.originalPrimaryImage ?? null
  } as CreateDraft<T> & S;
  cacheService.set(key, draft, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);
}

export function saveUpdateDraft<T, S = {}>(
  cacheService: CacheService,
  key: string,
  form: FormGroup,
  currentStep: CaseFormStep,
  mediaPayload?: CaseMediaPayload,
  caseSpecificData?: S
): void {
  const draft = {
    ...caseSpecificData,
    formValue: form.getRawValue(),
    currentStep,
    newPrimaryImage: mediaPayload?.primaryImage,
    newAdditionalImages: mediaPayload?.additionalImages,
    newVideo: mediaPayload?.video,
    deletedPhotoIds: mediaPayload?.deletedImageIds,
    removedVideo: mediaPayload?.removedVideo,
    primaryPhotoId: mediaPayload?.primaryPhotoId,
    originalPrimaryImage: mediaPayload?.originalPrimaryImage ?? null
  } as UpdateDraft<T> & S;
  cacheService.set(key, draft, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);
}

export function restoreCreateDraft<T, S = {}>(
  cacheService: CacheService,
  key: string,
  form: FormGroup,
  stepSetter: (step: CaseFormStep) => void,
  mediaSetters?: {
    primary?: (file: File | null) => void;
    originalPrimary?: (file: File | null) => void;
    additional?: (files: File[]) => void;
    video?: (file: File | null) => void;
  }
): (CreateDraft<T> & S) | undefined {
  const draft = cacheService.get<CreateDraft<T> & S>(key);
  if (!draft) return undefined;

  form.patchValue(draft.formValue as Partial<T>);
  stepSetter(draft.currentStep);

  if (mediaSetters) {
    if (draft.newPrimaryImage !== undefined && mediaSetters.primary) mediaSetters.primary(draft.newPrimaryImage);
    if (draft.originalPrimaryImage !== undefined && mediaSetters.originalPrimary) mediaSetters.originalPrimary(draft.originalPrimaryImage);
    if (draft.newAdditionalImages && mediaSetters.additional) mediaSetters.additional(draft.newAdditionalImages);
    if (draft.newVideo !== undefined && mediaSetters.video) mediaSetters.video(draft.newVideo);
  }

  return draft;
}

export function restoreUpdateDraft<T, S = {}>(
  cacheService: CacheService,
  key: string,
  form: FormGroup,
  stepSetter: (step: CaseFormStep) => void,
  mediaSetters?: {
    primary?: (file: File | null) => void;
    originalPrimary?: (file: File | null) => void;
    additional?: (files: File[]) => void;
    video?: (file: File | null) => void;
    deletedPhotoIds?: (ids: number[]) => void;
    removedVideo?: (removed: boolean) => void;
    primaryPhotoId?: (id: number | null) => void;
  }
): (UpdateDraft<T> & S) | undefined {
  const draft = cacheService.get<UpdateDraft<T> & S>(key);
  if (!draft) return undefined;

  form.patchValue(draft.formValue as Partial<T>);
  stepSetter(draft.currentStep);

  if (mediaSetters) {
    if (draft.newPrimaryImage !== undefined && mediaSetters.primary) mediaSetters.primary(draft.newPrimaryImage);
    if (draft.originalPrimaryImage !== undefined && mediaSetters.originalPrimary) mediaSetters.originalPrimary(draft.originalPrimaryImage);
    if (draft.newAdditionalImages && mediaSetters.additional) mediaSetters.additional(draft.newAdditionalImages);
    if (draft.newVideo !== undefined && mediaSetters.video) mediaSetters.video(draft.newVideo);
    if (draft.deletedPhotoIds && mediaSetters.deletedPhotoIds) mediaSetters.deletedPhotoIds(draft.deletedPhotoIds);
    if (draft.primaryPhotoId !== undefined && mediaSetters.primaryPhotoId) mediaSetters.primaryPhotoId(draft.primaryPhotoId);
    if (draft.removedVideo !== undefined && mediaSetters.removedVideo) mediaSetters.removedVideo(draft.removedVideo);
  }

  return draft;
}

export function clearDraft(cacheService: CacheService, key: string): void {
  cacheService.remove(key);
}
