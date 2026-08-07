import { AbstractControl, FormGroup } from '@angular/forms';

/**
 * Shared Form Validation Helper
 * Centralizes error extraction, control error merging/clearing, and invalidity checking
 * across all Cases forms, filters, and popups.
 */

export function isFieldInvalid(form: FormGroup, field: string): boolean {
  const c = form.get(field);
  return !!(c?.invalid && (c?.touched || c?.dirty));
}

export function getControlFieldError(control: AbstractControl | null): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty)) return null;
  const e = control.errors;
  if (e['required']) return 'هذا الحقل مطلوب';
  if (e['arabicText']) return 'يجب كتابة النص بالحروف العربية فقط';
  if (e['minlength']) return `الحد الأدنى ${e['minlength'].requiredLength} أحرف`;
  if (e['maxlength']) return `الحد الأقصى ${e['maxlength'].requiredLength} حرفاً`;
  if (e['min']) return `يجب أن لا تقل القيمة عن ${e['min'].min}`;
  if (e['max']) return `يجب أن لا تتجاوز القيمة ${e['max'].max}`;
  if (e['egyptianPhone']) return 'أدخل رقم هاتف مصري صحيح (مثال: 01xxxxxxxxx)';
  if (e['pastDate']) return 'لا يمكن أن يكون التاريخ في المستقبل';
  if (e['futureDate']) return 'لا يمكن أن يكون تاريخ ووقت الحادث في المستقبل';
  if (e['urgentTooOld']) return 'يجب أن يكون تاريخ ووقت الحادث خلال الـ 6 ساعات الماضية';
  if (e['urgentEventDate']) return 'تاريخ ووقت الحادث غير صحيح';
  if (e['description']) return 'لا يمكن أن يتجاوز الوصف 2000 حرف';
  if (e['validEnum']) return 'اختر قيمة صحيحة';
  if (e['numeric']) return 'أدخل قيمة رقمية صحيحة';
  if (e['integer']) return 'يجب أن يكون نطاق البحث عدداً صحيحاً';
  if (e['fullNameOrCaseCode']) return 'أدخل اسماً عربياً صحيحاً أو كود حالة صحيح.';
  if (e['dateRangeInvalid'] || e['dateRangeValid']) return 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية';
  if (e['allowedFileTypes']) return 'يسمح فقط بصور JPG و JPEG و PNG و WebP.';
  if (e['maxFileSize']) return `حجم الصورة يتجاوز الحد المسموح (${e['maxFileSize']?.maxMb ?? 5} MB)`;
  if (e['rejectionReason']) return 'يجب ألا يقل سبب الرفض عن 10 حروف وألا يتجاوز 500 حرف';
  return 'قيمة غير صحيحة';
}

export function getFormFieldError(form: FormGroup, field: string): string | null {
  return getControlFieldError(form.get(field));
}

export function setControlError(control: AbstractControl, errorKey: string, errorValue: any = true): void {
  const currentErrors = control.errors || {};
  if (!currentErrors[errorKey]) {
    control.setErrors({ ...currentErrors, [errorKey]: errorValue });
  }
}

export function clearControlError(control: AbstractControl, errorKey: string): void {
  if (!control.errors) return;
  const currentErrors = { ...control.errors };
  delete currentErrors[errorKey];
  const remainingKeys = Object.keys(currentErrors);
  control.setErrors(remainingKeys.length > 0 ? currentErrors : null);
}
