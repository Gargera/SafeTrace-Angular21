import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function egyptianPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const regex = /^(?:\+20|0020|0)?1[0125]\d{8}$/;
    if (!regex.test(control.value)) {
      return { invalidEgyptianPhone: true };
    }

    return null;
  };
}
