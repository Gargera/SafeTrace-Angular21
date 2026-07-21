import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function ageRangeValidator(minAgeControlName: string, maxAgeControlName: string): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const minControl = formGroup.get(minAgeControlName);
    const maxControl = formGroup.get(maxAgeControlName);

    if (!minControl || !maxControl) {
      return null;
    }

    // Skip if another validator has already found an error on the maxControl
    if (maxControl.errors && !maxControl.errors['ageRangeInvalid']) {
      return null;
    }

    const minAge = minControl.value !== null && minControl.value !== '' ? Number(minControl.value) : null;
    const maxAge = maxControl.value !== null && maxControl.value !== '' ? Number(maxControl.value) : null;

    if (minAge !== null && maxAge !== null) {
      if (maxAge < minAge) {
        maxControl.setErrors({ ageRangeInvalid: true });
        return { ageRangeInvalid: true };
      } else {
        maxControl.setErrors(null);
        return null;
      }
    }

    maxControl.setErrors(null);
    return null;
  };
}
