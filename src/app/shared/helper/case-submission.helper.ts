import { FormGroup } from '@angular/forms';
import { extractErrorMessage } from './error.helper';
import { applyCaseValidationErrors } from './case-form.helper';

export interface SubmissionErrorResult {
  message: string | null;
  mediaErrors: {
    primary?: string | null;
    additional?: string | null;
    video?: string | null;
    policeReport?: string | null;
  } | null;
  type?: 'validation' | 'server' | 'unknown';
}

export function handleSubmissionError(
  err: unknown,
  form: FormGroup,
  defaultMessage: string = 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.'
): SubmissionErrorResult {

  const msg = extractErrorMessage(err, defaultMessage);

  const hasValidationErrors =
    !!err &&
    typeof err === 'object' &&
    'error' in err &&
    typeof (err as { error?: unknown }).error === 'object' &&
    !!(err as {
      error?: { errors?: unknown }
    }).error?.errors;


  if (hasValidationErrors) {

    const tempErrors: {
      primary?: string;
      additional?: string;
      video?: string;
      policeReport?: string;
    } = {};

    const mappedToFields = applyCaseValidationErrors(err, form, {
      primary: (message) => (tempErrors.primary = message),
      additional: (message) => (tempErrors.additional = message),
      video: (message) => (tempErrors.video = message),
      policeReport: (message) => (tempErrors.policeReport = message),
    });


    const hasMediaErrors = Object.keys(tempErrors).length > 0;


    if (hasMediaErrors) {
      return {
        message: msg,
        mediaErrors: tempErrors,
        type: 'validation',
      };
    }

    if (mappedToFields) {
      return {
        message: msg,
        mediaErrors: null,
        type: 'validation',
      };
    }
  }

  return {
    message: msg,
    mediaErrors: null,
    type: 'unknown',
  };
}