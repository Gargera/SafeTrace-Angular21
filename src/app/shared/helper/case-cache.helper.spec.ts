import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FormBuilder } from '@angular/forms';
import {
  saveCreateDraft,
  saveUpdateDraft,
  restoreCreateDraft,
  restoreUpdateDraft,
  clearDraft,
  CaseMediaPayload
} from './case-cache.helper';
import { CaseFormStep } from './case-form.helper';
import { CACHE_TTL, CACHE_TAGS } from '../../core/cache/cache.constants';

describe('case-cache.helper.ts', () => {
  let cache: any;
  let form: any;

  beforeEach(() => {
    cache = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    };

    form = new FormBuilder().group({
      name: ['test'],
      disabledField: [{ value: 'disabledValue', disabled: true }]
    });
  });

  describe('Save Create Draft', () => {
    it('saves form raw value, step, media files, and custom case data', () => {
      const primaryFile = new File([''], 'primary.jpg');
      const addFile = new File([''], 'add.jpg');
      const videoFile = new File([''], 'video.mp4');

      const mediaPayload: CaseMediaPayload = {
        primaryImage: primaryFile,
        additionalImages: [addFile],
        video: videoFile
      };

      const customData = { customProp: 'hello' };

      saveCreateDraft(cache, 'createKey', form, 2, mediaPayload, customData);

      expect(cache.set).toHaveBeenCalledWith(
        'createKey',
        expect.objectContaining({
          formValue: { name: 'test', disabledField: 'disabledValue' },
          currentStep: 2,
          newPrimaryImage: primaryFile,
          newAdditionalImages: [addFile],
          newVideo: videoFile,
          customProp: 'hello'
        }),
        CACHE_TTL.UI_STATE,
        [CACHE_TAGS.UI_STATE]
      );
    });

    it('verifies system fields cannot be overwritten by caseSpecificData', () => {
      const mediaPayload: CaseMediaPayload = {
        primaryImage: new File([''], 'primary.jpg'),
      };

      // Try to inject malicious overrides
      const maliciousData = {
        formValue: { hacked: true },
        currentStep: 99,
        newPrimaryImage: new File([''], 'hacked.jpg')
      };

      saveCreateDraft(cache, 'createKey', form, 2, mediaPayload, maliciousData);

      expect(cache.set).toHaveBeenCalledWith(
        'createKey',
        expect.objectContaining({
          // Should keep the actual system values
          formValue: { name: 'test', disabledField: 'disabledValue' },
          currentStep: 2,
          newPrimaryImage: mediaPayload.primaryImage
        }),
        CACHE_TTL.UI_STATE,
        [CACHE_TAGS.UI_STATE]
      );
    });
  });

  describe('Save Update Draft', () => {
    it('saves deletedImageIds, removedVideo, and custom fields', () => {
      const mediaPayload: CaseMediaPayload = {
        deletedImageIds: [1, 2],
        removedVideo: true
      };

      const customData = { updateCustom: 'testUpdate' };

      saveUpdateDraft(cache, 'updateKey', form, 1, mediaPayload, customData);

      expect(cache.set).toHaveBeenCalledWith(
        'updateKey',
        expect.objectContaining({
          formValue: { name: 'test', disabledField: 'disabledValue' },
          currentStep: 1,
          deletedPhotoIds: [1, 2],
          removedVideo: true,
          updateCustom: 'testUpdate'
        }),
        CACHE_TTL.UI_STATE,
        [CACHE_TAGS.UI_STATE]
      );
    });
  });

  describe('Restore Create Draft', () => {
    it('restores form values, step, primary image, additional images, and video', () => {
      const primaryFile = new File([''], 'primary.jpg');
      const addFile = new File([''], 'add.jpg');
      const videoFile = new File([''], 'video.mp4');

      cache.get.mockReturnValue({
        formValue: { name: 'restoredTest', disabledField: 'restoredDisabled' },
        currentStep: 3,
        newPrimaryImage: primaryFile,
        newAdditionalImages: [addFile],
        newVideo: videoFile,
        customProp: 'hello'
      });

      let step: CaseFormStep = 1;
      let primary: File | null | undefined;
      let additional: File[] | undefined;
      let video: File | null | undefined;

      const result: any = restoreCreateDraft(cache, 'createKey', form, (s) => step = s, {
        primary: (f) => primary = f,
        additional: (f) => additional = f,
        video: (f) => video = f
      });

      expect(cache.get).toHaveBeenCalledWith('createKey');
      expect(form.getRawValue()).toEqual({ name: 'restoredTest', disabledField: 'restoredDisabled' });
      expect(step).toBe(3);
      expect(primary).toBe(primaryFile);
      expect(additional).toEqual([addFile]);
      expect(video).toBe(videoFile);
      expect(result?.customProp).toBe('hello');

      expect(result?.formValue).toEqual({
        name: 'restoredTest',
        disabledField: 'restoredDisabled'
      });

      expect(result?.currentStep).toBe(3);

      expect(result?.newPrimaryImage).toBe(primaryFile);

      expect(result?.newAdditionalImages).toEqual([
        addFile
      ]);

      expect(result?.newVideo).toBe(videoFile);
    });

    it('supports null media values during restore to allow clearing media', () => {
      cache.get.mockReturnValue({
        formValue: { name: 'nullTest' },
        currentStep: 1,
        newPrimaryImage: null,
        newVideo: null
      });

      let step: CaseFormStep = 1;
      let primary: File | null | undefined;
      let video: File | null | undefined;

      restoreCreateDraft(cache, 'createKey', form, (s) => step = s, {
        primary: (f) => primary = f,
        video: (f) => video = f
      });

      // Assert that primary and video correctly received null
      expect(primary).toBeNull();
      expect(video).toBeNull();
    });
  });

  describe('Restore Update Draft', () => {
    it('restores deleted photo ids, removed video state, and custom fields', () => {
      const addFile = new File([''], 'add.jpg');

      cache.get.mockReturnValue({
        formValue: { name: 'updateName', disabledField: 'val' },
        currentStep: 2,
        newAdditionalImages: [addFile],
        deletedPhotoIds: [5, 6],
        removedVideo: false,
        updateCustom: 'testUpdate'
      });

      let step: CaseFormStep = 1;
      let additional: File[] | undefined;
      let deletedIds: number[] | undefined;
      let removedVideo: boolean | undefined;

      const result: any = restoreUpdateDraft(cache, 'updateKey', form, (s) => step = s, {
        additional: (f) => additional = f,
        deletedPhotoIds: (ids) => deletedIds = ids,
        removedVideo: (r) => removedVideo = r
      });

      expect(cache.get).toHaveBeenCalledWith('updateKey');
      expect(form.getRawValue()).toEqual({ name: 'updateName', disabledField: 'val' });
      expect(step).toBe(2);
      expect(additional).toEqual([addFile]);
      expect(deletedIds).toEqual([5, 6]);
      expect(removedVideo).toBe(false);
      expect(result?.updateCustom).toBe('testUpdate');

      expect(result?.formValue).toEqual({
        name: 'updateName',
        disabledField: 'val'
      });

      expect(result?.currentStep).toBe(2);

      expect(result?.deletedPhotoIds).toEqual([
        5,
        6
      ]);

      expect(result?.removedVideo).toBe(false);
    });
  });

  describe('Clear Draft', () => {
    it('calls cacheService.remove correctly', () => {
      clearDraft(cache, 'testKey');
      expect(cache.remove).toHaveBeenCalledWith('testKey');
    });
  });
});
