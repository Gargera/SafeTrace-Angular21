import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  apiErrorMessage = signal<string>(''); // General Error State

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

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
        
        if (err.error?.errors) {
          const serverErrors = err.error.errors;
          for (const key in serverErrors) {
            const controlName = key.charAt(0).toLowerCase() + key.slice(1);
            const control = this.loginForm.get(controlName);
            if (control) 
            {
              control.setErrors({ serverError: serverErrors[key][0] });
            } 
            else 
            {
              this.apiErrorMessage.set(serverErrors[key][0]);
            }
          }
        } 
        else 
        {
          this.apiErrorMessage.set(err.error?.detail || err.error?.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول.');
        }
      }
    });
  }
}