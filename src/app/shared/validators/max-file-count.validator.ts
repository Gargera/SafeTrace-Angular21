import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function maxFileCountValidator(maxCount: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const files = control.value;
    if (!files || !Array.isArray(files)) {
      return null;
    }

    if (files.length > maxCount) {
      return { maxFileCountExceeded: true, maxCount };
    }

    return null;
  };
}
