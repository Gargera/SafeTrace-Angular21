import { signal, WritableSignal } from '@angular/core';
import { CaseMediaPayload } from '../../components/cases-components/case-media-uploader/case-media-uploader';

export function useCaseMediaState(options?: { onSaveDraft?: () => void }) {
  const initialPrimary = signal<File | null>(null);
  const initialOriginalPrimary = signal<File | null>(null);
  const initialAdditional = signal<File[]>([]);
  const initialVideo = signal<File | null>(null);

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
    mediaPayload.set(payload);

    initialPrimary.set(payload.primaryImage ?? null);
    initialOriginalPrimary.set(payload.originalPrimaryImage ?? null);
    initialAdditional.set(payload.additionalImages ?? []);
    initialVideo.set(payload.video ?? null);

    mediaErrors.set({});

    if (options?.onSaveDraft) {
      options.onSaveDraft();
    }
  };

  return {
    initialPrimary,
    initialOriginalPrimary,
    initialAdditional,
    initialVideo,
    mediaPayload,
    mediaErrors,
    onMediaChange
  };
}
