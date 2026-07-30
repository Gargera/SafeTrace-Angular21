import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function searchRadiusValidator(min = 1, max = 1000): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (val === null || val === undefined || val === '') {
      return null;
    }

    const num = Number(val);
    if (!Number.isFinite(num)) {
      return { numeric: true };
    }

    if (!Number.isInteger(num)) {
      return { integer: true };
    }

    if (num < min) {
      return { min: { min } };
    }

    if (num > max) {
      return { max: { max } };
    }

    return null;
  };
}
