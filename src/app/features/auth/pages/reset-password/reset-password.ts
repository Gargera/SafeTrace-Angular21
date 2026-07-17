import { FormField } from '../../../../shared/components/form-field/form-field';
import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SnackbarService } from '../../../../core/services/toast.service';
import Swal from 'sweetalert2';
import { mustMatch } from '../../../../shared/validators/must-match.validator';

import { ButtonComponent } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormField, ReactiveFormsModule, RouterModule,  ButtonComponent],
  templateUrl: './reset-password.html'
})
export class ResetPassword implements OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);

  step = signal<number>(1);
  isLoading = signal<boolean>(false);
  isResending = signal<boolean>(false);
  apiErrorMessage = signal<string>('');
  savedEmail = signal<string>('');
  countdown = signal<number>(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  emailForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.pattern('^\\S+$')]]
  });

  resetForm: FormGroup = this.fb.group({
    otpCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^\\d{6}$')]],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(50), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_])\\S+$')]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: mustMatch('newPassword', 'confirmPassword') });

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update(v => !v);
  }

  onRequestOtp() {
    this.apiErrorMessage.set('');
    if (this.emailForm.invalid) { this.emailForm.markAllAsTouched(); return; }

    this.isLoading.set(true);
    const email = this.emailForm.value.email;
    this.authService.forgetPassword(email).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.savedEmail.set(email);
        this.step.set(2);
        this.startCountdown();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.apiErrorMessage.set(err.error?.detail || 'حدث خطأ، تأكد من بريدك الإلكتروني.');
      }
    });
  }

  onResendOtp() {
    if (this.countdown() > 0) return;

    this.apiErrorMessage.set('');
    this.isResending.set(true);
    this.startCountdown();

    this.authService.forgetPassword(this.savedEmail()).subscribe({
      next: (res) => {
        this.isResending.set(false);
        this.snackbar.success('تم إرسال رمز جديد إلى بريدك الإلكتروني، الرمز صالح لمدة 10 دقائق.');
      },
      error: (err) => {
        this.isResending.set(false);
        this.countdown.set(0);
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        this.apiErrorMessage.set(err.error?.detail || 'حدث خطأ أثناء إعادة إرسال الرمز. يرجى المحاولة لاحقاً.');
      }
    });
  }

  onResetPassword() {
    this.apiErrorMessage.set('');
    if (this.resetForm.invalid) { this.resetForm.markAllAsTouched(); return; }

    this.isLoading.set(true);
    const payload = {
      email: this.savedEmail(),
      otpCode: this.resetForm.value.otpCode,
      newPassword: this.resetForm.value.newPassword
    };

    this.authService.resetPassword(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        Swal.fire({
          title: 'تم التغيير!', 
          text: res.message || 'تم إعادة تعيين كلمة المرور بنجاح.', 
          icon: 'success',
          confirmButtonColor: '#0058be', 
          customClass: { popup: 'rounded-xl font-body-md' }
        }).then(() => this.router.navigate(['/auth/login']));
      },
      error: (err) => {
        this.isLoading.set(false);
        this.apiErrorMessage.set(err.error?.detail || 'رمز التحقق غير صحيح أو منتهي الصلاحية.');
      }
    });
  }

  private startCountdown() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.countdown.set(60);
    this.intervalId = setInterval(() => {
      if (this.countdown() > 0) {
        this.countdown.update(c => c - 1);
      } else {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
      }
    }, 1000);
  }
}