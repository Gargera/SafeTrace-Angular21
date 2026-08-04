import { FormField } from '../../../../shared/components/form-field/form-field';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import Swal from 'sweetalert2';
import { mustMatch } from '../../../../shared/validators/must-match.validator';

import { ButtonComponent } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormField, ReactiveFormsModule, RouterModule,  ButtonComponent],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  apiErrorMessage = signal<string>('');
  
  isPasswordVisible = signal<boolean>(false);
  isConfirmPasswordVisible = signal<boolean>(false);

    registerForm: FormGroup = this.fb.group({
    fName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[\u0600-\u06FF]+$/)]],
    lName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[\u0600-\u06FF]+( [\u0600-\u06FF]+)*$/)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern('^\\S+$')]],
    phoneNumber: ['', [Validators.pattern('^01[0125][0-9]{8}$')]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(50), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_])\\S+$')]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: mustMatch('password', 'confirmPassword') });

  togglePasswordVisibility() {
    this.isPasswordVisible.update(v => !v);
  }

  toggleConfirmPasswordVisibility() {
    this.isConfirmPasswordVisible.update(v => !v);
  }

  onSubmit() {
    this.registerForm.markAllAsTouched();
    this.apiErrorMessage.set('');

    if (this.registerForm.invalid) return;

    this.isLoading.set(true);

    const formData = { ...this.registerForm.value };
    formData.fName = formData.fName.trim();
    formData.lName = formData.lName.trim();
    delete formData.confirmPassword;
    if (!formData.phoneNumber) {
      delete formData.phoneNumber;
    }

    this.authService.register(formData).subscribe({
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