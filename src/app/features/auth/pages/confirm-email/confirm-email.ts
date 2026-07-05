import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './confirm-email.html'
})
export class ConfirmEmail implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  email = signal<string>('');
  isLoading = signal<boolean>(false);
  apiErrorMessage = signal<string>('');

  confirmForm: FormGroup = this.fb.group({
    otpCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  ngOnInit() {
    const state = history.state;
    if (state && state.email) {
      this.email.set(state.email);
    } else {
      this.router.navigate(['/auth/login']); // منع الدخول المباشر للصفحة بدون إيميل
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
          // 🛑 التعديل هنا: استخدام رسالة الباك إند مباشرة
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
    this.authService.resendOtp(this.email(), 1).subscribe({
      next: (res) => {
        // 🛑 التعديل هنا: استخدام رسالة الباك إند
        Swal.fire('تم الإرسال', res.message, 'success');
      },
      error: (err) => {
        Swal.fire('خطأ', err.error?.detail || 'حدث خطأ أثناء محاولة إرسال الرمز.', 'error');
      }
    });
  }
}