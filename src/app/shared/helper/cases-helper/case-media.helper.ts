import { signal } from '@angular/core';
import { CaseMediaPayload } from '../../components/cases-components/case-media-uploader/case-media-uploader';

export function useCaseMediaState(options?: { onSaveDraft?: () => void }) {
  const initialPrimary = signal<File | null>(null);
  const initialOriginalPrimary = signal<File | null>(null);
  const initialAdditional = signal<File[]>([]);
  const initialVideo = signal<File | null>(null);
  const initialDeletedPhotoIds = signal<number[]>([]);
  const initialPrimaryPhotoId = signal<number | null>(null);
  const initialExistingVideoDeleted = signal(false);

  const mediaPayload = signal<CaseMediaPayload>({
    primaryImage: null,
    additionalImages: [],
    video: null,
    deletedImageIds: [],
    primaryPhotoId: null,
    originalPrimaryImage: null
  });

  const mediaErrors = signal<any>({});

  const onMediaChange = (payload: CaseMediaPayload): void => {
    const current = mediaPayload();
    const currentErrors = { ...mediaErrors() };

    // Clear primary errors only if primary image or photo id changed
    if (
      payload.primaryImage !== current.primaryImage ||
      payload.originalPrimaryImage !== current.originalPrimaryImage ||
      payload.primaryPhotoId !== current.primaryPhotoId
    ) {
      delete currentErrors.primary;
    }

    // Clear additional errors only if additional images or deleted ids changed
    if (
      payload.additionalImages !== current.additionalImages ||
      payload.deletedImageIds !== current.deletedImageIds ||
      payload.additionalImages?.length !== current.additionalImages?.length ||
      payload.deletedImageIds?.length !== current.deletedImageIds?.length
    ) {
      delete currentErrors.additional;
    }

    // Clear video errors when either the upload or the existing-video action changed.
    if (
      payload.video !== current.video ||
      payload.isExistingVideoDeleted !== current.isExistingVideoDeleted
    ) {
      delete currentErrors.video;
    }

    mediaPayload.set(payload);

    initialPrimary.set(payload.primaryImage ?? null);
    initialOriginalPrimary.set(payload.originalPrimaryImage ?? null);
    initialAdditional.set(payload.additionalImages ?? []);
    initialVideo.set(payload.video ?? null);
    initialDeletedPhotoIds.set([...(payload.deletedImageIds ?? [])]);
    initialPrimaryPhotoId.set(payload.primaryPhotoId);
    initialExistingVideoDeleted.set(payload.isExistingVideoDeleted ?? false);

    mediaErrors.set(currentErrors);

    if (options?.onSaveDraft) {
      options.onSaveDraft();
    }
  };

  return {
    initialPrimary,
    initialOriginalPrimary,
    initialAdditional,
    initialVideo,
    initialDeletedPhotoIds,
    initialPrimaryPhotoId,
    initialExistingVideoDeleted,
    mediaPayload,
    mediaErrors,
    onMediaChange
  };
}
