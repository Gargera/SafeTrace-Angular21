import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SnackbarService } from '../../../../core/services/toast.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './confirm-email.html'
})
export class ConfirmEmail implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);

  email = signal<string>('');
  isLoading = signal<boolean>(false);
  apiErrorMessage = signal<string>('');
  countdown = signal<number>(0);
  private intervalId: any;

  confirmForm: FormGroup = this.fb.group({
    otpCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  ngOnInit() {
    const state = history.state;
    if (state && state.email) {
      this.email.set(state.email);
      this.startCountdown();
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  onSubmit() {
    this.apiErrorMessage.set('');
    if (this.confirmForm.invalid) {
      this.confirmForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.authService.confirmEmail(this.email(), this.confirmForm.value.otpCode).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        Swal.fire({
          title: 'تم التأكيد!',
          text: res.message || 'تم تفعيل حسابك بنجاح. يمكنك الآن تسجيل الدخول.',
          icon: 'success',
          confirmButtonText: 'تسجيل الدخول',
          confirmButtonColor: '#0058be',
          customClass: { popup: 'rounded-xl font-body-md' }
        }).then(() => this.router.navigate(['/auth/login']));
      },
      error: (err) => {
        this.isLoading.set(false);
        this.apiErrorMessage.set(err.error?.detail || 'الرمز غير صحيح أو منتهي الصلاحية.');
      }
    });
  }

  resendOtp() {
    if (this.countdown() > 0) return;
    
    this.startCountdown();

    this.authService.resendOtp(this.email(), 1).subscribe({
      next: (res) => {
        this.snackbar.success(res.message || 'تم إرسال الرمز بنجاح.');
      },
      error: (err) => {
        this.countdown.set(0);
        clearInterval(this.intervalId);
        this.snackbar.error(err.error?.detail || 'حدث خطأ أثناء محاولة إرسال الرمز.');
      }
    });
  }

  private startCountdown() {
    this.countdown.set(60);
    this.intervalId = setInterval(() => {
      if (this.countdown() > 0) {
        this.countdown.update(c => c - 1);
      } else {
        clearInterval(this.intervalId);
      }
    }, 1000);
  }
}