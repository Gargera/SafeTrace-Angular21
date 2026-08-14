import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  CaseFormStep,
  nextCaseFormStep,
  previousCaseFormStep,
  localDateInputValue,
  CaseObjectUrlRegistry,
  validateCaseSubmission,
  applyCaseValidationErrors,
  CaseImageErrorHandlers
} from './case-form.helper';
import { CaseMediaUploaderComponent } from '../components/cases-components/case-media-uploader/case-media-uploader';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-mock-media-uploader',
  standalone: true,
  template: ''
})
class MockMediaUploader {
  @Input() valid = true;
  validate() {
    return this.valid;
  }
}

describe('case-form.helper.ts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Step Management', () => {
    it('should navigate to next step correctly', () => {
      expect(nextCaseFormStep(1)).toBe(2);
      expect(nextCaseFormStep(2)).toBe(3);
      expect(nextCaseFormStep(3)).toBe(3);
    });

    it('should navigate to previous step correctly', () => {
      expect(previousCaseFormStep(3)).toBe(2);
      expect(previousCaseFormStep(2)).toBe(1);
      expect(previousCaseFormStep(1)).toBe(1);
    });
  });

  describe('Date Handling', () => {
    it('should use local date to format YYYY-MM-DD', () => {
      const fixedDate = new Date(2023, 5, 15); // Month is 0-indexed, so 5 = June
      const result = localDateInputValue(fixedDate);
      expect(result).toBe('2023-06-15');
    });

    it('should format single digit days and months properly', () => {
      const fixedDate = new Date(2022, 0, 5); // Jan 5
      expect(localDateInputValue(fixedDate)).toBe('2022-01-05');
    });
  });

  describe('Object URL Management', () => {
    it('should safely replace and revoke single URLs', () => {
      const registry = new CaseObjectUrlRegistry();
      const file1 = new File([''], 'test1.jpg');
      const file2 = new File([''], 'test2.jpg');

      const url1 = registry.replace('primary', file1);
      expect(url1).toBeTruthy();

      const url2 = registry.replace('primary', file2);
      expect(url2).toBeTruthy();
      expect(url1).not.toBe(url2);

      registry.revoke('primary'); // Should not throw
    });

    it('should safely replace and revoke multiple URLs', () => {
      const registry = new CaseObjectUrlRegistry();
      const files1 = [new File([''], 'a.jpg'), new File([''], 'b.jpg')];

      const urls = registry.replaceMany('additional', files1);
      expect(urls).toBeTruthy();
      expect(urls!.length).toBe(2);

      registry.revoke('additional');
    });

    it('should revoke all URLs cleanly', () => {
      const registry = new CaseObjectUrlRegistry();
      registry.replace('primary', new File([''], '1.jpg'));
      registry.replaceMany('additional', [new File([''], '2.jpg')]);

      expect(() => registry.revokeAll()).not.toThrow();
    });

    it('should return null when createObjectURL fails', () => {
      vi.spyOn(URL, 'createObjectURL')
        .mockImplementation(() => {
          throw new Error('failed');
        });

      const registry = new CaseObjectUrlRegistry();

      expect(
        registry.replace(
          'primary',
          new File([''], 'test.jpg')
        )
      ).toBeNull();
    });
  });

  describe('Validation Flow', () => {
    let form: FormGroup;
    let mockUploader: any;

    beforeEach(() => {
      const fb = new FormBuilder();
      form = fb.group({
        name: ['', Validators.required]
      });
      mockUploader = new MockMediaUploader();
    });

    it('should return invalid if form is invalid', () => {
      const result = validateCaseSubmission(form, mockUploader);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('يرجى مراجعة البيانات المدخلة');
    });

    it('should return invalid if media uploader is invalid', () => {
      form.get('name')?.setValue('Test');
      mockUploader.valid = false;
      const result = validateCaseSubmission(form, mockUploader);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('يرجى مراجعة الصور');
    });

    it('should return valid if form and uploader are valid', () => {
      form.get('name')?.setValue('Test');
      mockUploader.valid = true;
      const result = validateCaseSubmission(form, mockUploader);
      expect(result.valid).toBe(true);
    });
  });

  describe('Backend Validation Mapping', () => {
    let form: FormGroup;
    let handlers: CaseImageErrorHandlers;

    beforeEach(() => {
      const fb = new FormBuilder();
      form = fb.group({
        fName: [''],
        eventDate: ['']
      });
      handlers = {
        primary: () => { },
        additional: () => { },
        video: () => { },
        policeReport: () => { }
      };
    });

    it('should map PascalCase keys to camelCase form controls', () => {
      const err = {
        error: {
          errors: {
            FName: ['الاسم مطلوب'],
            EventDate: ['التاريخ مطلوب']
          }
        }
      };

      const mapped = applyCaseValidationErrors(err, form, handlers);
      expect(mapped).toBe(true);
      expect(form.get('fName')?.errors?.['server']).toBe('الاسم مطلوب');
      expect(form.get('eventDate')?.errors?.['server']).toBe('التاريخ مطلوب');
    });

    it('should map media keys to respective handlers', () => {
      let primaryMsg = '';
      let policeMsg = '';
      let additionalMsg = '';
      let videoMsg = '';

      handlers.primary = (m) => primaryMsg = m;
      handlers.policeReport = (m) => policeMsg = m;
      handlers.additional = (m) => additionalMsg = m;
      handlers.video = (m) => videoMsg = m;

      const err = {
        error: {
          errors: {
            PrimaryImage: ['الصورة الأساسية مطلوبة'],
            PoliceReportFile: ['الملف غير مدعوم'],
            AdditionalPhotos: ['صور إضافية غير صالحة'],
            VideoFile: ['فيديو غير صالح']
          }
        }
      };

      const mapped = applyCaseValidationErrors(err, form, handlers);
      expect(mapped).toBe(true);
      expect(primaryMsg).toBe('الصورة الأساسية مطلوبة');
      expect(policeMsg).toBe('الملف غير مدعوم');
      expect(additionalMsg).toBe('صور إضافية غير صالحة');
      expect(videoMsg).toBe('فيديو غير صالح');
    });

    it('should handle primary error when field contains both keywords', () => {
      let primaryMsg = '';
      let additionalMsg = '';
      handlers.primary = (m) => primaryMsg = m;
      handlers.additional = (m) => additionalMsg = m;

      const err = { error: { errors: { PrimaryAdditionalImages: ['خطأ'] } } };
      applyCaseValidationErrors(err, form, handlers);

      expect(additionalMsg).toBe('خطأ');
      expect(primaryMsg).toBe('');
    });

    it('should safely ignore missing errors object or non-object payloads', () => {
      expect(applyCaseValidationErrors(null, form, handlers)).toBe(false);
      expect(applyCaseValidationErrors(undefined, form, handlers)).toBe(false);
      expect(applyCaseValidationErrors('string', form, handlers)).toBe(false);
      expect(applyCaseValidationErrors({ error: null }, form, handlers)).toBe(false);
      expect(applyCaseValidationErrors({ error: 'string' }, form, handlers)).toBe(false);
      expect(applyCaseValidationErrors({ error: { message: 'Some error' } }, form, handlers)).toBe(false);
      expect(applyCaseValidationErrors({ error: { errors: null } }, form, handlers)).toBe(false);
      expect(applyCaseValidationErrors({ error: { errors: 'string' } }, form, handlers)).toBe(false);
      expect(applyCaseValidationErrors({ error: { errors: [] } }, form, handlers)).toBe(false);
    });

    it('should ignore unknown backend fields', () => {

      const err = {
        error: {
          errors: {
            UnknownField: ['error']
          }
        }
      };

      expect(
        applyCaseValidationErrors(err, form, handlers)
      )
        .toBe(false);

    });
    it('should use first validation message only', () => {

      const err = {
        error: {
          errors: {
            FName: [
              'الاسم مطلوب',
              'خطأ ثاني'
            ]
          }
        }
      };

      applyCaseValidationErrors(err, form, handlers);

      expect(
        form.get('fName')?.errors?.['server']
      )
        .toBe('الاسم مطلوب');

    });
  });
});
