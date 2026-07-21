import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function dateRangeValidator(fromDateControlName: string, toDateControlName: string): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const fromControl = formGroup.get(fromDateControlName);
    const toControl = formGroup.get(toDateControlName);

    if (!fromControl || !toControl) {
      return null;
    }

    // Skip if another validator has already found an error on the toControl
    if (toControl.errors && !toControl.errors['dateRangeInvalid']) {
      return null;
    }

    if (fromControl.value && toControl.value) {
      const fromDate = new Date(fromControl.value);
      const toDate = new Date(toControl.value);

      if (fromDate > toDate) {
        toControl.setErrors({ dateRangeInvalid: true });
        return { dateRangeInvalid: true };
      } else {
        toControl.setErrors(null);
        return null;
      }
    }

    toControl.setErrors(null);
    return null;
  };
}
