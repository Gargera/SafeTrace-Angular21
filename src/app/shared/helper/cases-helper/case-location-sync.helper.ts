import { DestroyRef, WritableSignal } from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { getCitiesForGovernorate } from '../../../core/constants/governorates';
import { validCity } from '../../validators/city.validator';

export function bindGovernorateCityValidation(
  form: FormGroup,
  destroyRef: DestroyRef,
  availableCities: WritableSignal<string[]>
): void {
  form.get('city')?.setValidators([
    Validators.required,
    validCity(() => form.get('government')?.value ?? null),
  ]);
  form.get('city')?.updateValueAndValidity();

  form.get('government')?.valueChanges
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe((gov) => {
      const cities = getCitiesForGovernorate(gov);
      availableCities.set(cities);
      const currentCity = form.get('city')?.value;
      if (currentCity && !cities.includes(currentCity)) {
        form.get('city')?.setValue('');
      }
      form.get('city')?.updateValueAndValidity();
    });
}
