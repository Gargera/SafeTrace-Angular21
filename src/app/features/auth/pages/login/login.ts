import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import Swal from 'sweetalert2'; // تأكدي إنك ضفتي الـ import ده

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'] // أو بدونها لو حذفتيها
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  apiErrorMessage = signal<string>('');
  
  showPassword = signal<boolean>(false);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    this.loginForm.markAllAsTouched();
    this.apiErrorMessage.set('');

    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isLoading.set(false);
        
        const errorMessage = err.error?.detail || err.error?.message || '';
        
        if (errorMessage.includes('تأكيد') || errorMessage.includes('مفعل') || errorMessage.includes('confirm') || errorMessage.includes('verified')) {
          Swal.fire({
            title: 'حسابك غير مفعل!',
            text: 'يجب تأكيد بريدك الإلكتروني لتتمكن من استخدام المنصة.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#0058be',
            cancelButtonColor: '#75777d',
            confirmButtonText: 'الذهاب لتأكيد الحساب',
            cancelButtonText: 'إلغاء',
            customClass: { popup: 'rounded-xl font-body-md' }
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/auth/confirm-email'], { state: { email: this.loginForm.value.email } });
            }
          });
          return;
        }

        if (err.error?.errors) {
          const serverErrors = err.error.errors;
          for (const key in serverErrors) {
            const controlName = key.charAt(0).toLowerCase() + key.slice(1);
            const control = this.loginForm.get(controlName);
            if (control) {
              control.setErrors({ serverError: serverErrors[key][0] });
            } else {
              this.apiErrorMessage.set(serverErrors[key][0]);
            }
          }
        } else {
          this.apiErrorMessage.set(errorMessage || 'بيانات الدخول غير صحيحة.');
        }
      }
    });
  }
}