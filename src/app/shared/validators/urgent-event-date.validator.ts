import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function urgentEventDate(maxHoursAgo: number = 6): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) {
      return { urgentEventDate: true };
    }

    const now = new Date();

    // 1-minute buffer to handle clock skew / current minute selection
    const futureLimit = new Date(now.getTime() + 60 * 1000);
    if (date > futureLimit) {
      return { futureDate: true };
    }

    const pastLimit = new Date(now.getTime() - maxHoursAgo * 60 * 60 * 1000);
    if (date < pastLimit) {
      return { urgentTooOld: true };
    }

    return null;
  };
}

export function toDatetimeLocalString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
