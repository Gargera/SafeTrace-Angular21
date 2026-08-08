import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ConfirmationModalComponent } from '../../confirmation-modal/confirmation-modal';


import { getFormFieldError, isFieldInvalid } from '../../../helper/form-validation.helper';
import { CacheService } from '../../../../core/cache/cache.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-reject-case-popup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmationModalComponent],
  templateUrl: './reject-case-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RejectCasePopupComponent implements OnInit {
  isSubmitting = input(false);
  apiError = input<string | null>(null);
  contextKey = input<string>();

  cancel = output<void>();
  confirm = output<string>();

  private readonly fb = inject(FormBuilder);
  private readonly cacheService = inject(CacheService);
  private readonly destroyRef = inject(DestroyRef);

  readonly DEFAULT_REASON = 'لم تستوفِ الحالة متطلبات المراجعة. يرجى مراجعة البيانات وإعادة إرسال الطلب.';

  readonly form = this.fb.nonNullable.group({
    rejectionReason: [this.DEFAULT_REASON],
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

  ngOnInit() {
    if (this.contextKey()) {
      const cached = this.cacheService.get<string>(this.contextKey()!);
      if (cached) {
        this.form.patchValue({ rejectionReason: cached });
      }
      this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(val => {
        this.cacheService.set(this.contextKey()!, val.rejectionReason, 300000); // 5 mins
      });
    }
  }

  onConfirm(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.reasonControl.markAsTouched();
      return;
    }

    let trimmedReason = this.reasonControl.value.trim();
    if (!trimmedReason) {
      trimmedReason = this.DEFAULT_REASON;
    }
    this.confirm.emit(trimmedReason);
  }

  onCancel(): void {
    this.form.reset();
    this.cancel.emit();
  }
}
