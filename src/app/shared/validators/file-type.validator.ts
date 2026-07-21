import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function fileTypeValidator(allowedTypes: string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const files = control.value;
    if (!files) {
      return null;
    }

    const fileArray = Array.isArray(files) ? files : [files];
    
    for (const file of fileArray) {
      if (file instanceof File && !allowedTypes.includes(file.type)) {
        return { invalidFileType: true, allowedTypes };
      }
    }

    return null;
  };
}
