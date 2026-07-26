import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ConfirmationModalComponent } from '../../confirmation-modal/confirmation-modal';
import { rejectionReasonValidator } from '../../../validators/rejection-reason.validator';

import { getFormFieldError, isFieldInvalid } from '../../../helper/form-validation.helper';

@Component({
  selector: 'app-reject-case-popup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmationModalComponent],
  templateUrl: './reject-case-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RejectCasePopupComponent {
  isSubmitting = input(false);
  apiError = input<string | null>(null);

  cancel = output<void>();
  confirm = output<string>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    rejectionReason: ['', [rejectionReasonValidator()]],
  });

  get reasonControl() {
    return this.form.controls.rejectionReason;
  }

  isInvalid(field = 'rejectionReason'): boolean {
    return isFieldInvalid(this.form, field);
  }

  getFieldError(field = 'rejectionReason'): string | null {
    return getFormFieldError(this.form, field);
  }

  onConfirm(): void {
    if (this.form.invalid) {
      this.reasonControl.markAsTouched();
      return;
    }

    const trimmedReason = this.reasonControl.value.trim();
    this.confirm.emit(trimmedReason);
  }

  onCancel(): void {
    this.form.reset();
    this.cancel.emit();
  }
}
