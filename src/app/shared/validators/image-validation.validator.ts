import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
export const ALLOWED_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const IMAGE_VALIDATION_ERRORS = {
  INVALID_TYPE: 'يسمح فقط بصور JPG و JPEG و PNG و WebP.',
  MAX_SIZE: (maxMb: number = 5) => `حجم الصورة يتجاوز الحد المسموح (${maxMb} MB)`,
};

export interface ImageValidationResult {
  valid: boolean;
  errorMessage?: string;
}

export function isImageExtensionValid(filename: string): boolean {
  if (!filename) return false;
  const extIndex = filename.lastIndexOf('.');
  if (extIndex === -1) return false;
  const ext = filename.slice(extIndex).toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext as (typeof ALLOWED_IMAGE_EXTENSIONS)[number]);
}

export function isImageContentTypeValid(contentType: string): boolean {
  if (!contentType) return false;
  return ALLOWED_IMAGE_CONTENT_TYPES.includes(contentType.toLowerCase() as (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number]);
}

/**
 * Validates an image file against allowed extensions (.jpg, .jpeg, .png, .webp)
 * AND allowed MIME content-types (image/jpeg, image/png, image/webp).
 * Validation succeeds ONLY when BOTH checks pass.
 */
export function validateImageFile(file: File, maxMb: number = 5): ImageValidationResult {
  if (!file) {
    return { valid: false, errorMessage: 'لم يتم اختيار ملف.' };
  }

  const extensionValid = isImageExtensionValid(file.name);
  const contentTypeValid = isImageContentTypeValid(file.type);

  if (!extensionValid || !contentTypeValid) {
    return {
      valid: false,
      errorMessage: IMAGE_VALIDATION_ERRORS.INVALID_TYPE,
    };
  }

  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      errorMessage: IMAGE_VALIDATION_ERRORS.MAX_SIZE(maxMb),
    };
  }

  return { valid: true };
}

export function validateProfileImage(file: File): ImageValidationResult {
  return validateImageFile(file, 5);
}

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
