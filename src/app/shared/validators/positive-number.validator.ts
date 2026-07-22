import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function positiveNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (value === null || value === undefined || value === '') {
            return null;
        }

        const num = Number(value);

        if (isNaN(num)) {
            return { positiveNumber: true };
        }

        return num > 0 ? null : { positiveNumber: true };
    };
}