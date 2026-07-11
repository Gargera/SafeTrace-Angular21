import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html'
})
export class ResetPassword implements OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  step = signal<number>(1);
  isLoading = signal<boolean>(false);
  isResending = signal<boolean>(false);
  apiErrorMessage = signal<string>('');
  savedEmail = signal<string>('');
  countdown = signal<number>(0);
  private intervalId: any;

  showPassword = signal<boolean>(false);

  emailForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  resetForm: FormGroup = this.fb.group({
    otpCode: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$')]]
  });

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  togglePassword() {
    this.showPassword.update(v => !v);
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
        Swal.fire({
          title: 'تم الإرسال!',
          text: 'تم إرسال رمز جديد إلى بريدك الإلكتروني، الرمز صالح لمدة 10 دقائق.',
          icon: 'success',
          confirmButtonColor: '#0058be',
          customClass: { popup: 'rounded-xl font-body-md' }
        });
      },
      error: (err) => {
        this.isResending.set(false);
        this.countdown.set(0);
        clearInterval(this.intervalId);
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
    this.countdown.set(60);
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      if (this.countdown() > 0) {
        this.countdown.update(c => c - 1);
      } else {
        clearInterval(this.intervalId);
      }
    }, 1000);
  }
}