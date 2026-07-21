import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function maxFileSizeValidator(maxSizeMB: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const files = control.value;
    if (!files) {
      return null;
    }

    const fileArray = Array.isArray(files) ? files : [files];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    for (const file of fileArray) {
      if (file instanceof File && file.size > maxSizeBytes) {
        return { maxFileSizeExceeded: true, maxSizeMB };
      }
    }

    return null;
  };
}
