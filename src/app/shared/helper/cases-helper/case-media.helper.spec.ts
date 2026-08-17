import { useCaseMediaState } from './case-media.helper';

describe('case-media.helper', () => {
  it('should clear only related media errors on payload change', () => {
    const state = useCaseMediaState();

    state.mediaErrors.set({
      primary: 'Primary Error',
      additional: 'Additional Error',
      video: 'Video Error'
    });

    state.onMediaChange({
      primaryImage: new File([''], 'newPrimary.jpg'),
      additionalImages: [],
      video: null,
      deletedImageIds: [],
      primaryPhotoId: null,
      originalPrimaryImage: null
    });

    expect(state.mediaErrors().primary).toBeUndefined();
    expect(state.mediaErrors().additional).toBe('Additional Error');
    expect(state.mediaErrors().video).toBe('Video Error');

    state.onMediaChange({
      primaryImage: new File([''], 'newPrimary.jpg'),
      additionalImages: [new File([''], 'add1.jpg')],
      video: null,
      deletedImageIds: [],
      primaryPhotoId: null,
      originalPrimaryImage: null
    });

    expect(state.mediaErrors().additional).toBeUndefined();
    expect(state.mediaErrors().video).toBe('Video Error');

    state.onMediaChange({
      primaryImage: new File([''], 'newPrimary.jpg'),
      additionalImages: [new File([''], 'add1.jpg')],
      video: new File([''], 'vid.mp4'),
      deletedImageIds: [],
      primaryPhotoId: null,
      originalPrimaryImage: null
    });

    expect(state.mediaErrors().video).toBeUndefined();
  });
});
