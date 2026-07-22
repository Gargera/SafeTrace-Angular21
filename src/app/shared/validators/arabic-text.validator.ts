import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const ARABIC_TEXT_REGEX = /^[\u0621-\u064A]+(?:\s+[\u0621-\u064A]+)*$/;

export function arabicText(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (value === null || value === undefined) {
            return null;
        }

        const text = String(value).trim();

        if (!text) {
            return null;
        }

        return ARABIC_TEXT_REGEX.test(text) ? null : { arabicText: true };
    };
}