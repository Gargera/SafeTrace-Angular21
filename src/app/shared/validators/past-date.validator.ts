import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function pastDate(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (value === null || value === undefined || value === '') {
            return null;
        }

        const date = value instanceof Date ? value : new Date(value);

        if (isNaN(date.getTime())) {
            return { pastDate: true };
        }

        return date.getTime() <= Date.now() ? null : { pastDate: true };
    };
}