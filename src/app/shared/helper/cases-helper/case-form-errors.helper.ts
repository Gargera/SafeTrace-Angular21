import { FormGroup } from '@angular/forms';
import { getFormFieldError, isFieldInvalid } from '../form-validation.helper';

export function useCaseFormErrors(form: FormGroup) {
  const getFieldError = (field: string): string | null => {
    return getFormFieldError(form, field);
  };

  const isInvalid = (field: string): boolean => {
    return isFieldInvalid(form, field);
  };

  return {
    getFieldError,
    isInvalid,
    isInvalidFn: isInvalid.bind(null),
    getErrorFn: getFieldError.bind(null)
  };
}
