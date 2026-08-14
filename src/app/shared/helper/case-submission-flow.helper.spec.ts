import { FormBuilder, FormGroup } from '@angular/forms';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import {
  executeCaseSubmissionFlow,
  CaseSubmissionFlowDeps
} from './case-submission-flow.helper';

import { DuplicateDecision } from '../enums/duplicate-decision';


describe('case-submission-flow.helper.ts', () => {

  let deps: CaseSubmissionFlowDeps;
  let form: FormGroup;


  beforeEach(() => {

    form = new FormBuilder().group({
      name: ['test']
    });


    deps = {
      isSubmitting: {
        set: vi.fn()
      },

      errorMsg: {
        set: vi.fn()
      },

      mediaErrors: {
        set: vi.fn()
      },

      form,

      cacheService: {
        remove: vi.fn()
      },

      draftKey: 'test-draft',

      snackbar: {
        success: vi.fn(),
        error: vi.fn()
      },

      router: {
        navigate: vi.fn()
      },

      successRoute: '/success',

      successMessage: 'تم إنشاء الحالة بنجاح',

      closeDialogs: vi.fn(),

      onSuccess: vi.fn(),

      handleDuplicate: vi.fn(),

      onComplete: vi.fn()
    };
  });


  describe('Success Flow', () => {

    it('should complete successful submission flow in the correct order', () => {
      const callOrder: string[] = [];
      
      deps.cacheService.remove = vi.fn().mockImplementation(() => callOrder.push('removeDraft'));
      deps.onSuccess = vi.fn().mockImplementation(() => callOrder.push('onSuccess'));
      deps.closeDialogs = vi.fn().mockImplementation(() => callOrder.push('closeDialogs'));
      deps.snackbar.success = vi.fn().mockImplementation(() => callOrder.push('snackbar'));
      deps.router.navigate = vi.fn().mockImplementation(() => callOrder.push('navigate'));

      const response = {
        isSuccess: true,
        data: {}
      };

      executeCaseSubmissionFlow(
        of(response),
        deps
      );

      expect(callOrder).toEqual([
        'removeDraft',
        'onSuccess',
        'closeDialogs',
        'snackbar',
        'navigate'
      ]);
    });

  });



  describe('Duplicate Flow', () => {

    it('should call duplicate handler and stop success flow', () => {

      const response = {
        isSuccess: true,
        data: {
          duplicateDecision:
            DuplicateDecision.SameUserDuplicate
        }
      };


      executeCaseSubmissionFlow(
        of(response),
        deps
      );


      expect(deps.handleDuplicate)
        .toHaveBeenCalledWith(
          response.data
        );


      expect(deps.cacheService.remove)
        .not.toHaveBeenCalled();


      expect(deps.router.navigate)
        .not.toHaveBeenCalled();


      expect(deps.snackbar.success)
        .not.toHaveBeenCalled();


      expect(deps.onComplete)
        .toHaveBeenCalled();

    });

  });



  describe('Failed Response Flow', () => {

    it('should handle unsuccessful response', () => {
      executeCaseSubmissionFlow(
        of({
          isSuccess: false
        }),
        deps
      );

      expect(deps.errorMsg.set)
        .toHaveBeenCalledWith(
          'حدث خطأ أثناء تنفيذ العملية.'
        );

      expect(deps.cacheService.remove)
        .not.toHaveBeenCalled();

      expect(deps.onComplete)
        .toHaveBeenCalled();
    });

    it('should display backend message instead of fallback when provided', () => {
      executeCaseSubmissionFlow(
        of({
          isSuccess: false,
          message: 'Backend error message'
        }),
        deps
      );

      expect(deps.errorMsg.set)
        .toHaveBeenCalledWith('Backend error message');
      
      expect(deps.cacheService.remove)
        .not.toHaveBeenCalled();

      expect(deps.onComplete)
        .toHaveBeenCalled();
    });

  });



  describe('Backend Error Flow', () => {

    it('should handle validation error and set media errors', () => {

      const error = {
        error: {
          errors: {
            PrimaryImage: [
              'الصورة مطلوبة'
            ]
          }
        }
      };


      executeCaseSubmissionFlow(
        throwError(() => error),
        deps
      );


      expect(deps.isSubmitting.set)
        .toHaveBeenCalledWith(false);


      expect(deps.mediaErrors.set)
        .toHaveBeenCalledWith(
          expect.objectContaining({
            primary: 'الصورة مطلوبة'
          })
        );


      expect(deps.errorMsg.set)
        .toHaveBeenCalledWith(
          'الصورة مطلوبة'
        );


      expect(deps.onComplete)
        .toHaveBeenCalled();

    });



    it('should handle backend message error', () => {
      const error = {
        error: {
          message: 'حدث خطأ من السيرفر'
        }
      };

      executeCaseSubmissionFlow(
        throwError(() => error),
        deps
      );

      expect(deps.errorMsg.set)
        .toHaveBeenCalledWith(
          'حدث خطأ من السيرفر'
        );

      expect(deps.onComplete)
        .toHaveBeenCalled();
    });

    it('should clear previous media errors using {} if there are no new media errors', () => {
      executeCaseSubmissionFlow(
        throwError(() => ({ error: { message: 'Some other error' } })),
        deps
      );

      expect(deps.mediaErrors.set).toHaveBeenCalledWith({});
      expect(deps.errorMsg.set).toHaveBeenCalledWith('Some other error');
    });

  });



  describe('Completion Flow', () => {

    it('should always call onComplete after success', () => {

      executeCaseSubmissionFlow(
        of({
          isSuccess: true,
          data: {}
        }),
        deps
      );


      expect(deps.onComplete)
        .toHaveBeenCalled();

    });


    it('should always call onComplete after error', () => {

      executeCaseSubmissionFlow(
        throwError(() => ({
          error: {
            message: 'error'
          }
        })),
        deps
      );


      expect(deps.onComplete)
        .toHaveBeenCalled();

    });

  });

});