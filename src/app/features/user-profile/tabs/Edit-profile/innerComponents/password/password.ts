import { Component, inject, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../../../../core/services/auth.service';
import { SnackbarService } from '../../../../../../shared/services/toast.service';
import { mustMatch } from '../../../../../../shared/validators/must-match.validator';
import { ChangePasswordDTO } from '../../../../model/profile.model';

// ── Custom validator: new password must differ from current ────────────────
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const current = group.get('currentPassword')?.value;
  const next = group.get('newPassword')?.value;
  if (next && current && current === next) {
    return { samePassword: true };
  }
  return null;
}

@Component({
  selector: 'app-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './password.html',
})
export class Password {
  // ── adminOnlyLabel: shows "(مدير فقط)" qualifier in the heading ──────────
  readonly adminOnlyLabel = input<boolean>(false);

  readonly passwordSaved = output<void>();

  readonly #fb = inject(FormBuilder);
  readonly #authService = inject(AuthService);
  readonly #snackbar = inject(SnackbarService);

  // ── Editing / Loading Flags ───────────────────────────────────────────────
  readonly isEditingPassword = signal(false);
  readonly isSavingPassword = signal(false);

  // ── Password visibility toggles ───────────────────────────────────────────
  readonly showPassword = signal(false);
  readonly showNewPassword = signal(false);

  // ── Form ──────────────────────────────────────────────────────────────────
  readonly passwordForm: FormGroup = this.#fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])\S+$/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordMatchValidator, mustMatch('newPassword', 'confirmPassword')] },
  );

  constructor() {
    // Form starts disabled; enabled only when user clicks "تغيير كلمة المرور"
    this.passwordForm.disable();
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  isPasswordInvalid(field: string): boolean {
    const ctrl = this.passwordForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  getPasswordError(): string | null {
    const ctrl = this.passwordForm.get('newPassword');
    if (!ctrl?.touched || !ctrl?.invalid) return null;
    if (ctrl.hasError('required')) return 'كلمة المرور الجديدة مطلوبة';
    if (ctrl.hasError('minlength') || ctrl.hasError('maxlength') || ctrl.hasError('pattern'))
      return 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل ولا تزيد عن 50، وأن تتضمن حرفًا كبيرًا، وحرفًا صغيرًا، ورقمًا، ورمزًا خاصًا، وبدون مسافات.';
    return null;
  }

  get samePasswordError(): boolean {
    return !!(
      this.passwordForm.hasError('samePassword') && this.passwordForm.get('newPassword')?.touched
    );
  }

  get passwordMismatchError(): boolean {
    return !!(
      this.passwordForm.get('confirmPassword')?.hasError('mustMatch') &&
      this.passwordForm.get('confirmPassword')?.touched
    );
  }

  // ── Edit / Cancel toggles ─────────────────────────────────────────────────

  togglePasswordEdit(edit: boolean): void {
    this.isEditingPassword.set(edit);
    if (edit) {
      this.passwordForm.enable();
    } else {
      this.passwordForm.disable();
    }
  }

  cancelPassword(): void {
    this.togglePasswordEdit(false);
    this.passwordForm.reset();
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  savePassword(): void {
    if (this.passwordForm.invalid || this.isSavingPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSavingPassword.set(true);

    const dto: ChangePasswordDTO = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
    };

    this.#authService.changePassword(dto).subscribe({
      next: () => {
        this.isSavingPassword.set(false);
        this.togglePasswordEdit(false);
        this.#snackbar.success('تم تغيير كلمة المرور بنجاح');
        this.passwordForm.reset();
        this.passwordSaved.emit();
      },
      error: (err) => {
        this.isSavingPassword.set(false);
        const msg =
          err?.error?.message ||
          err.error?.detail || 
          'كلمة المرور الحالية غير صحيحة أو حدث خطأ أثناء تغيير كلمة المرور.';
        this.#snackbar.error(msg);
      },
    });
  }
}
