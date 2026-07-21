import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function pastDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const inputDate = new Date(control.value);
    // Set time to 00:00:00 to compare dates accurately
    inputDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (inputDate > today) {
      return { futureDateInvalid: true };
    }

    return null;
  };
}
