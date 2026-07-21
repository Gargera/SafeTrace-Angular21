import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function positiveIds(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (value === null || value === undefined) {
            return null;
        }

        if (!Array.isArray(value)) {
            return { positiveIds: true };
        }

        const allPositive = value.every(id => typeof id === 'number' && id > 0);
        return allPositive ? null : { positiveIds: true };
    };
}