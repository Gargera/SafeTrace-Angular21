import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import Swal from 'sweetalert2';
import { SocialAuthService, GoogleLoginProvider, FacebookLoginProvider, GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, GoogleSigninButtonModule],
  templateUrl: './login.html'
})
export class Login implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private socialAuthService = inject(SocialAuthService);

  isLoading = signal<boolean>(false);
  apiErrorMessage = signal<string>('');
  showPassword = signal<boolean>(false);
  
  private authSubscription!: Subscription;

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  ngOnInit() {
    this.authSubscription = this.socialAuthService.authState.subscribe((user) => {
      if (user) {
        this.isLoading.set(true);
        this.apiErrorMessage.set('');
        
        if (user.provider === GoogleLoginProvider.PROVIDER_ID) {
          this.authService.googleLogin({ providerToken: user.idToken! }).subscribe({
            next: (res) => {
              this.isLoading.set(false);
              this.router.navigate(['/home']);
            },
            error: (err) => {
              this.isLoading.set(false);
              this.handleAuthError(err);
            }
          });
        } else if (user.provider === FacebookLoginProvider.PROVIDER_ID) {
          this.authService.facebookLogin({ providerToken: user.authToken! }).subscribe({
            next: (res) => {
              this.isLoading.set(false);
              this.router.navigate(['/home']);
            },
            error: (err) => {
              this.isLoading.set(false);
              this.handleAuthError(err);
            }
          });
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  signInWithFB(): void {
    this.socialAuthService.signIn(FacebookLoginProvider.PROVIDER_ID);
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    this.loginForm.markAllAsTouched();
    this.apiErrorMessage.set('');

    if (this.loginForm.invalid) return;

    setTimeout(() => {
      this.isLoading.set(true);
    }, 10);
    
    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        setTimeout(() => {
          this.isLoading.set(false);
          this.router.navigate(['/home']);
        }, 400);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.handleAuthError(err);
      }
    });
  }

  private handleAuthError(err: any) {
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
          const emailForConfirm = this.loginForm.value.email || ''; 
          this.router.navigate(['/auth/confirm-email'], { state: { email: emailForConfirm } });
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
      this.apiErrorMessage.set(errorMessage || 'حدث خطأ أثناء تسجيل الدخول.');
    }
  }
}