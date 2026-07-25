import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function rejectionReasonValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const rawValue = control.value;
    if (rawValue === null || rawValue === undefined || typeof rawValue !== 'string') {
      return { required: true };
    }

    const trimmed = rawValue.trim();
    if (trimmed.length === 0) {
      return { required: true };
    }

    if (trimmed.length < 10) {
      return { minlength: { requiredLength: 10, actualLength: trimmed.length } };
    }

    if (trimmed.length > 500) {
      return { maxlength: { requiredLength: 500, actualLength: trimmed.length } };
    }

    return null;
  };
}
