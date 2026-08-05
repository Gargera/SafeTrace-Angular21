import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';

import { FoundPersonInfoRequest } from '../../../../core/models/cases.model';
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from '../../../../core/constants/governorates';
import { getFormFieldError, isFieldInvalid } from '../../../../shared/helper/form-validation.helper';

// Shared validators
import { arabicText } from '../../../validators/arabic-text.validator';
import { pastDate } from '../../../validators/past-date.validator';

@Component({
  selector: 'app-founded-popup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FormField],
  templateUrl: './founded-popup.html',
  styleUrls: ['./founded-popup.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoundedPopupComponent implements OnInit {
  caseId = input<number>();

  cancel = output<void>();
  confirmed = output<FoundPersonInfoRequest>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly governorates = EGYPT_GOVERNORATES;
  readonly availableCities = signal<string[]>([]);
  readonly isSubmitting = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    government: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(100)]],
    city: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(100)]],
    street: ['', [Validators.maxLength(200)]],
    foundedAt: ['', [Validators.required, pastDate()]],
  });

  ngOnInit(): void {
    this.form.get('government')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((gov) => {
        const cities = getCitiesForGovernorate(gov);
        this.availableCities.set(cities);
        const currentCity = this.form.get('city')?.value;
        if (currentCity && !cities.includes(currentCity)) {
          this.form.get('city')?.setValue('');
        }
      });
  }

  getFieldError(field: string): string | null {
    return getFormFieldError(this.form, field);
  }

  isInvalid(controlName: string): boolean {
    return isFieldInvalid(this.form, controlName);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.confirmed.emit(this.form.getRawValue());
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancel.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancel.emit();
  }
}
