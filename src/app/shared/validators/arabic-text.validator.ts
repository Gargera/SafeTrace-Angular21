import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function arabicTextValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const regex = /^[\u0621-\u064A]+(?:\s+[\u0621-\u064A]+)*$/;
    if (!regex.test(control.value)) {
      return { invalidArabicText: true };
    }

    return null;
  };
}
