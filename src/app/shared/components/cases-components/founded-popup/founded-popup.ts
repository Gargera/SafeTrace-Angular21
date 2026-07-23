import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';

import { FoundPersonInfoRequest } from '../../../../core/models/Cases.model';
import { EGYPT_GOVERNORATES } from '../../../../core/constants/governorates';

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
export class FoundedPopupComponent {
  caseId = input<number>();

  cancel = output<void>();
  confirmed = output<FoundPersonInfoRequest>();

  private readonly fb = inject(FormBuilder);

  readonly governorates = EGYPT_GOVERNORATES;
  readonly isSubmitting = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    government: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(100)]],
    city: ['', [Validators.required, arabicText(), Validators.minLength(2), Validators.maxLength(100)]],
    street: ['', [Validators.maxLength(200)]],
    foundedAt: ['', [Validators.required, pastDate()]],
  });

  getFieldError(field: string): string | null {
    const control = this.form.get(field);
    if (!control || !control.errors || !(control.touched || control.dirty)) return null;
    const e = control.errors;
    if (e['required']) return 'هذا الحقل مطلوب';
    if (e['arabicText']) return 'يجب كتابة النص بالحروف العربية فقط';
    if (e['minlength']) return `الحد الأدنى ${e['minlength'].requiredLength} أحرف`;
    if (e['maxlength']) return `الحد الأقصى ${e['maxlength'].requiredLength} حرفاً`;
    if (e['description']) return 'لا يمكن أن يتجاوز الوصف 2000 حرف';
    if (e['pastDate']) return 'لا يمكن أن يكون التاريخ في المستقبل';
    return 'قيمة غير صحيحة';
  }

  isInvalid(controlName: keyof FoundPersonInfoRequest): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.touched || control.dirty));
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
