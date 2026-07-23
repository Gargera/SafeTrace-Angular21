import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function ageRangeValid(minAgeControlName: string, maxAgeControlName: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
        const minAgeControl = formGroup.get(minAgeControlName);
        const maxAgeControl = formGroup.get(maxAgeControlName);

        if (!minAgeControl || !maxAgeControl) {
            return null;
        }

        if (maxAgeControl.errors && !maxAgeControl.errors['ageRangeValid']) {
            return null;
        }

        const minAge = minAgeControl.value;
        const maxAge = maxAgeControl.value;

        if (minAge === null || minAge === undefined || minAge === '' ||
            maxAge === null || maxAge === undefined || maxAge === '') {
            maxAgeControl.setErrors(null);
            return null;
        }

        if (Number(maxAge) < Number(minAge)) {
            maxAgeControl.setErrors({ ageRangeValid: true });
            return { ageRangeValid: true };
        }

        maxAgeControl.setErrors(null);
        return null;
    };
}