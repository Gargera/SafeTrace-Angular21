import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isImageExtensionValid, isImageContentTypeValid } from '../../features/user-profile/tabs/Edit-profile/utilies/image-validation.util';

function toFileArray(value: unknown): File[] | null {
    if (value === null || value === undefined) return [];
    if (value instanceof File) return [value];
    if (Array.isArray(value)) return value as File[];
    if (typeof FileList !== 'undefined' && value instanceof FileList) return Array.from(value);
    return null;
}

/** Ensures every uploaded file is JPG, JPEG, PNG, or WebP. */
export function allowedFileTypes(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const files = toFileArray(control.value);

        if (files === null) {
            return { allowedFileTypes: true };
        }
        if (files.length === 0) {
            return null;
        }

        const allValid = files.every(f => isImageExtensionValid(f.name) && isImageContentTypeValid(f.type));
        return allValid ? null : { allowedFileTypes: true };
    };
}

/** Ensures every uploaded file is within the size limit (in MB). */
export function maxFileSize(maxMb: number): ValidatorFn {
    const maxBytes = maxMb * 1024 * 1024;

    return (control: AbstractControl): ValidationErrors | null => {
        const files = toFileArray(control.value);

        if (files === null) {
            return { maxFileSize: true };
        }
        if (files.length === 0) {
            return null;
        }

        const allValid = files.every(f => f.size <= maxBytes);
        return allValid ? null : { maxFileSize: { maxMb } };
    };
}

/** Limits the number of uploaded files. */
export function maxFilesCount(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const files = toFileArray(control.value);

        if (files === null) {
            return { maxFilesCount: true };
        }

        return files.length <= max ? null : { maxFilesCount: { max } };
    };
}