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
import { arabicTextValidator } from '../../../../shared/validators/arabic-text.validator';
import { pastDateValidator } from '../../../../shared/validators/past-date.validator';

import { FoundPersonInfoRequest } from '../../../../core/models/Cases.model';

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

  readonly isSubmitting = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(2000), arabicTextValidator()]],
    government: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), arabicTextValidator()]],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), arabicTextValidator()]],
    street: ['', [Validators.required, Validators.maxLength(200)]],
    foundedAt: ['', [Validators.required, pastDateValidator()]],
  });

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
