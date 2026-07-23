import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function validEnum(enumObj: object): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (value === null || value === undefined || value === '') {
            return null; // allow Validators.required to handle the empty case
        }

        const allowed = Object.values(enumObj);
        return allowed.includes(value) ? null : { validEnum: true };
    };
}
