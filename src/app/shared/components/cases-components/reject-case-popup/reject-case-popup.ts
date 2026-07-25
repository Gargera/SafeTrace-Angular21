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

  get showErrors(): boolean {
    return this.reasonControl.invalid && (this.reasonControl.touched || this.reasonControl.dirty);
  }

  get errorMessage(): string | null {
    if (!this.showErrors) return null;
    const errors = this.reasonControl.errors;
    if (!errors) return null;
    if (errors['required']) return 'سبب الرفض مطلوب';
    if (errors['minlength']) return 'يجب ألا يقل سبب الرفض عن 10 حروف';
    if (errors['maxlength']) return 'يجب ألا يتجاوز سبب الرفض 500 حرف';
    return 'قيمة غير صحيحة';
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
