import { FormGroup } from '@angular/forms';
import { Observable, Subscription, timeout } from 'rxjs';
import { CaseMediaErrors } from './case-form.helper';
import { handleSubmissionError } from './case-submission-error.helper';

import { DuplicateDecision } from '../../enums/duplicate-decision';
import { MatchedCaseResponse } from '../../../core/models/cases.model';
import { CaseType } from '../../enums/case-type';

export interface CaseSubmissionData {
  duplicateDecision?: DuplicateDecision;
  isBlocked?: boolean;
  matchedCases?: MatchedCaseResponse[];
  existingCaseType?: CaseType | null;
}

export interface CaseSubmissionResponse<T = unknown> {
  isSuccess: boolean;
  message?: string;
  data?: T & CaseSubmissionData;
}

export interface CaseSubmissionFlowDeps<TDuplicate = unknown> {
  isSubmitting: { set: (val: boolean) => void };
  errorMsg: { set: (val: string | null) => void };
  mediaErrors: { set: (val: CaseMediaErrors) => void };
  form: FormGroup;
  cacheService: { remove: (key: string) => void };
  draftKey: string;
  snackbar: { success: (msg: string) => void; error: (msg: string) => void };
  router: { navigate(commands: readonly unknown[]): void };
  successRoute: string | readonly unknown[];
  successMessage: string;
  closeDialogs?: () => void;
  onSuccess?: () => void;
  handleDuplicate?: (data: TDuplicate & CaseSubmissionData) => void;
  onComplete?: () => void;
  defaultErrorMessage?: string;
}

export function executeCaseSubmissionFlow<TDuplicate = unknown>(
  requestObservable: Observable<CaseSubmissionResponse<TDuplicate>>,
  deps: CaseSubmissionFlowDeps<TDuplicate>
): Subscription {
  deps.isSubmitting.set(true);
  deps.errorMsg.set(null);

  return requestObservable
    .pipe(
      timeout(15000)
    )
    .subscribe({
      next: (res) => {
        deps.isSubmitting.set(false);

        if (!res.isSuccess) {
          deps.errorMsg.set(res.message ?? 'حدث خطأ أثناء تنفيذ العملية.');
          deps.onComplete?.();
          return;
        }

        if (
          res.data &&
          res.data.duplicateDecision &&
          res.data.duplicateDecision !== DuplicateDecision.None
        ) {
          deps.handleDuplicate?.(res.data);
        } else {
          deps.cacheService.remove(deps.draftKey);
          deps.onSuccess?.();
          deps.closeDialogs?.();
          deps.snackbar.success(deps.successMessage);

          const route = Array.isArray(deps.successRoute)
            ? deps.successRoute
            : [deps.successRoute];

          deps.router.navigate(route);
        }

        deps.onComplete?.();
      },

      error: (err: unknown) => {
        deps.isSubmitting.set(false);
        deps.onComplete?.();

        const e = err as any;

        const isNetworkError =
          e?.status === 0 ||
          e?.name === 'NetworkError' ||
          e?.name === 'TimeoutError' ||
          e?.message?.includes('Timeout');

        if (isNetworkError) {
          deps.errorMsg.set(
            'تعذر الاتصال بالإنترنت. يرجى التحقق من الاتصال والمحاولة مرة أخرى.'
          );

          deps.mediaErrors.set({});
          return;
        }

        const result = handleSubmissionError(
          err,
          deps.form,
          deps.defaultErrorMessage
        );

        deps.mediaErrors.set(result.mediaErrors ?? {});
        deps.errorMsg.set(result.message ?? null);
      },
    });
}
