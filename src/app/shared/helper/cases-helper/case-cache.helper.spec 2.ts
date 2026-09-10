import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it, vi } from 'vitest';
import { saveCreateDraft, saveUpdateDraft, restoreUpdateDraft } from './case-cache.helper';

describe('case cache media state', () => {
  const form = new FormGroup({ name: new FormControl('test') });

  it('does not persist update-only video deletion state in create drafts', () => {
    const cache = { set: vi.fn() } as any;

    saveCreateDraft(cache, 'create', form, 3, {
      primaryImage: new File(['primary'], 'primary.jpg', { type: 'image/jpeg' }),
      additionalImages: [],
      video: null,
      deletedImageIds: [],
      primaryPhotoId: null,
      isExistingVideoDeleted: true,
    });

    const draft = cache.set.mock.calls[0][1];
    expect(draft).not.toHaveProperty('isExistingVideoDeleted');
    expect(draft).not.toHaveProperty('removedVideo');
    expect(draft).not.toHaveProperty('primaryPhotoId');
  });

  it('persists update image deletion, explicit primary null, and existing-video deletion', () => {
    const cache = { set: vi.fn() } as any;
    const primary = new File(['primary'], 'primary.jpg', { type: 'image/jpeg' });

    saveUpdateDraft(cache, 'update', form, 3, {
      primaryImage: primary,
      additionalImages: [],
      video: null,
      deletedImageIds: [10, 11],
      primaryPhotoId: null,
      isExistingVideoDeleted: true,
    });

    const draft = cache.set.mock.calls[0][1];
    expect(draft.newPrimaryImage).toBe(primary);
    expect(draft.deletedPhotoIds).toEqual([10, 11]);
    expect(draft.primaryPhotoId).toBeNull();
    expect(draft.isExistingVideoDeleted).toBe(true);
  });

  it('restores explicit primary null and an empty deletion list without fallback', () => {
    const primaryPhotoId = vi.fn();
    const deletedPhotoIds = vi.fn();
    const isExistingVideoDeleted = vi.fn();
    const cache = {
      get: vi.fn().mockReturnValue({
        formValue: { name: 'restored' },
        currentStep: 3,
        deletedPhotoIds: [],
        primaryPhotoId: null,
        isExistingVideoDeleted: true,
      }),
    } as any;

    restoreUpdateDraft(cache, 'update', form, vi.fn(), {
      primaryPhotoId,
      deletedPhotoIds,
      isExistingVideoDeleted,
    });

    expect(primaryPhotoId).toHaveBeenCalledWith(null);
    expect(deletedPhotoIds).toHaveBeenCalledWith([]);
    expect(isExistingVideoDeleted).toHaveBeenCalledWith(true);
  });
});
