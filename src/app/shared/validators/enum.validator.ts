import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function enumValidator(enumType: any): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null; // Don't validate if empty. Use Validators.required for required fields.
    }

    // Get all values of the enum
    const enumValues = Object.values(enumType);

    if (!enumValues.includes(control.value)) {
      return { invalidEnum: true };
    }

    return null;
  };
}
