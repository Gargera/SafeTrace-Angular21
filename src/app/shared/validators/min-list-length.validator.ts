import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function minListLengthValidator(minLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const list = control.value;
    if (list === null || list === undefined) {
      return null;
    }

    if (Array.isArray(list) && list.length < minLength) {
      return { minListLengthNotMet: true, minLength };
    }

    return null;
  };
}
