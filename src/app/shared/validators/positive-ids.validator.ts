import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function positiveIdsValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const ids = control.value;
    if (!ids) {
      return null;
    }

    const idArray = Array.isArray(ids) ? ids : [ids];
    
    for (const id of idArray) {
      if (typeof id === 'number' && id <= 0) {
        return { nonPositiveId: true };
      }
    }

    return null;
  };
}
