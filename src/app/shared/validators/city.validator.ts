import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { getCitiesForGovernorate } from '../../core/constants/governorates';

/**
 * City validator — validates that the selected city exists in the official
 * city list for the currently selected governorate.
 *
 * This is preferred over arabicText() for city fields because:
 * - City names may contain Arabic numerals (e.g. "٦ أكتوبر")
 * - The allowed values are fully enumerated in the project's governorate constants
 * - Only values from the official constants are accepted (not arbitrary Arabic strings)
 *
 * @param getGovernorate A function that returns the current governorate value
 */
export function validCity(getGovernorate: () => string | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const city = control.value;

    if (!city || city === '') {
      return null; // let required validator handle missing
    }

    const gov = getGovernorate();
    if (!gov) {
      // No governorate selected yet — can't validate city membership yet
      return null;
    }

    const allowed = getCitiesForGovernorate(gov);
    if (allowed.length === 0) {
      // Unknown governorate — don't block submission on frontend
      return null;
    }

    return allowed.includes(city) ? null : { invalidCity: true };
  };
}
