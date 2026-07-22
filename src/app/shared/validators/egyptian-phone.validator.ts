import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

export function egyptianPhone(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (value === null || value === undefined) {
            return null;
        }

        const phone = String(value).trim();

        if (!phone) {
            return null;
        }

        return EGYPTIAN_PHONE_REGEX.test(phone) ? null : { egyptianPhone: true };
    };
}