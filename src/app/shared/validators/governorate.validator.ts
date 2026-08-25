import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { EGYPT_GOVERNORATES } from '../../core/constants/governorates';

/**
 * Governorate validator — validates that the selected governorate exists in the official
 * governorate list.
 *
 * @returns A ValidatorFn that validates governorate membership
 */
export function validGovernorate(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const gov = control.value;

    if (!gov || gov === '') {
      return null; // let required validator handle missing
    }

    return EGYPT_GOVERNORATES.includes(gov) ? null : { invalidGovernorate: true };
  };
}
