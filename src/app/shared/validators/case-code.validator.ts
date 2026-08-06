import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const CASE_CODE_REGEX = /^(URG|LNG|UNK)-\d+$/i;
const MAX_CASE_CODE_LENGTH = 20;

export function caseCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const text = String(control.value ?? '').trim();

    if (!text) {
      return null;
    }

    if (!CASE_CODE_REGEX.test(text)) {
      return { invalidCaseCode: true };
    }

    if (text.length > MAX_CASE_CODE_LENGTH) {
      return {
        maxlength: {
          requiredLength: MAX_CASE_CODE_LENGTH,
          actualLength: text.length,
        },
      };
    }

    return null;
  };
}
