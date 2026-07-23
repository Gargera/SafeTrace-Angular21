import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function dateRangeValid(fromDateControlName: string, toDateControlName: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
        const fromDateControl = formGroup.get(fromDateControlName);
        const toDateControl = formGroup.get(toDateControlName);

        if (!fromDateControl || !toDateControl) {
            return null;
        }

        if (toDateControl.errors && !toDateControl.errors['dateRangeValid']) {
            return null;
        }

        const fromValue = fromDateControl.value;
        const toValue = toDateControl.value;

        if (!fromValue || !toValue) {
            toDateControl.setErrors(null);
            return null;
        }

        const fromDate = fromValue instanceof Date ? fromValue : new Date(fromValue);
        const toDate = toValue instanceof Date ? toValue : new Date(toValue);

        if (toDate.getTime() < fromDate.getTime()) {
            toDateControl.setErrors({ dateRangeValid: true });
            return { dateRangeValid: true };
        }

        toDateControl.setErrors(null);
        return null;
    };
}