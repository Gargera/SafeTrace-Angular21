import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function minListLength(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (value === null || value === undefined) {
            return null;
        }

        if (!Array.isArray(value)) {
            return { minListLength: { requiredLength: min } };
        }

        return value.length >= min
            ? null
            : { minListLength: { requiredLength: min, actualLength: value.length } };
    };
}