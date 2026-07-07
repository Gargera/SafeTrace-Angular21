import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  apiErrorMessage = signal<string>('');

  registerForm: FormGroup = this.fb.group({
    fName: ['', [Validators.required, Validators.maxLength(100)]],
    lName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern('^01[0125][0-9]{8}$')]],
    password: ['', [Validators.required, Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).+$')]]
  });

  onSubmit() {
    this.registerForm.markAllAsTouched();
    this.apiErrorMessage.set('');

    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.authService.register(this.registerForm.value).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        Swal.fire({
          title: 'تم إنشاء الحساب!',
          text: res.message || 'يرجى مراجعة بريدك الإلكتروني لتفعيل الحساب.',
          icon: 'success',
          confirmButtonColor: '#0058be',
          customClass: { popup: 'rounded-xl font-body-md' }
        }).then(() => {
          this.router.navigate(['/auth/confirm-email'], { state: { email: this.registerForm.value.email } });
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.error?.errors) {
          const serverErrors = err.error.errors;
          for (const key in serverErrors) {
            const controlName = key.charAt(0).toLowerCase() + key.slice(1);
            const control = this.registerForm.get(controlName);
            if (control) {
              control.setErrors({ serverError: serverErrors[key][0] });
            } else {
              this.apiErrorMessage.set(serverErrors[key][0]);
            }
          }
        } else {
          this.apiErrorMessage.set(err.error?.detail || err.error?.message || 'حدث خطأ أثناء التسجيل.');
        }
      }
    });
  }
}