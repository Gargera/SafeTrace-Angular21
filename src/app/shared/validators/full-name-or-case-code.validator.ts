import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const CASE_CODE_REGEX = /^(URG|LNG|UNK)-\d+$/i;
const ARABIC_TEXT_REGEX = /^[\u0621-\u064A]+(?:\s+[\u0621-\u064A]+)*$/;

const MAX_FULL_NAME_LENGTH = 243;
const MAX_CASE_CODE_LENGTH = 20;

export function fullNameOrCaseCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const text = String(control.value ?? '').trim();

    if (!text) {
      return null;
    }

    // Case Code
    if (CASE_CODE_REGEX.test(text)) {
      if (text.length > MAX_CASE_CODE_LENGTH) {
        return {
          maxlength: {
            requiredLength: MAX_CASE_CODE_LENGTH,
            actualLength: text.length,
          },
        };
      }

      return null;
    }

    // Full Name
    if (text.length > MAX_FULL_NAME_LENGTH) {
      return {
        maxlength: {
          requiredLength: MAX_FULL_NAME_LENGTH,
          actualLength: text.length,
        },
      };
    }

    if (!ARABIC_TEXT_REGEX.test(text)) {
      return { fullNameOrCaseCode: true };
    }

    return null;
  };
}