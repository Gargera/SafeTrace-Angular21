import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { clearControlError, setControlError } from '../helper/form-validation.helper';

export function dateRangeValidator(fromDateControlName = 'fromDate', toDateControlName = 'toDate'): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const fromControl = group.get(fromDateControlName);
    const toControl = group.get(toDateControlName);

    if (!fromControl || !toControl) {
      return null;
    }

    const fromVal = fromControl.value;
    const toVal = toControl.value;

    if (fromVal && toVal) {
      const fromDate = new Date(fromVal);
      const toDate = new Date(toVal);
      if (fromDate > toDate) {
        setControlError(fromControl, 'dateRangeInvalid');
        setControlError(toControl, 'dateRangeInvalid');
        return { dateRangeInvalid: true };
      }
    }

    clearControlError(fromControl, 'dateRangeInvalid');
    clearControlError(toControl, 'dateRangeInvalid');
    return null;
  };
}

export function dateRangeValid(fromDateControlName = 'fromDate', toDateControlName = 'toDate'): ValidatorFn {
  return dateRangeValidator(fromDateControlName, toDateControlName);
}