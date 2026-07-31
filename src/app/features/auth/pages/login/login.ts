import { FormField } from '../../../../shared/components/form-field/form-field';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import Swal from 'sweetalert2';
import {
  SocialAuthService,
  GoogleLoginProvider,
  GoogleSigninButtonModule,
} from '@abacritt/angularx-social-login';
import { Subscription } from 'rxjs';

import { ButtonComponent } from '../../../../shared/components/button/button';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormField,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    GoogleSigninButtonModule,
    ButtonComponent,
  ],
  templateUrl: './login.html',
})
export class Login implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private socialAuthService = inject(SocialAuthService);
  private location = inject(Location);

  isLoading = signal<boolean>(false);
  apiErrorMessage = signal<string>('');
  showPassword = signal<boolean>(false);

  private authSubscription!: Subscription;
  private returnUrl = '/home';

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.pattern('^\\S+$')]],
    password: ['', [Validators.required]],
  });

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home'], { replaceUrl: true });
      return;
    }

    const rawReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (rawReturnUrl && !this.isAuthUrl(rawReturnUrl)) {
      this.returnUrl = rawReturnUrl;
    } else {
      this.returnUrl = '/home';
    }

    this.authSubscription = this.socialAuthService.authState.subscribe((user) => {
      if (user) {
        this.isLoading.set(true);
        this.apiErrorMessage.set('');

        if (user.provider === GoogleLoginProvider.PROVIDER_ID) {
          this.authService.googleLogin({ providerToken: user.idToken! }).subscribe({
            next: () => {
              this.isLoading.set(false);
              this.navigateAfterLogin();
            },
            error: (err) => {
              this.isLoading.set(false);
              this.handleAuthError(err);
            },
          });
        }
      }
    });
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  onSubmit() {
    this.loginForm.markAllAsTouched();
    this.apiErrorMessage.set('');

    if (this.loginForm.invalid) return;

    this.isLoading.set(true);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.navigateAfterLogin();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.handleAuthError(err);
      },
    });
  }

  private navigateAfterLogin() {
    const rawReturn = this.route.snapshot.queryParamMap.get('returnUrl');
    let target = this.returnUrl;

    if (rawReturn && !this.isAuthUrl(rawReturn)) {
      target = rawReturn;
    }

    if (this.isAuthUrl(target)) {
      target = '/home';
    }

    this.router.navigateByUrl(target, { replaceUrl: true });
  }

  private isAuthUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return (
      lower.includes('/auth') ||
      lower.includes('confirm-email') ||
      lower.includes('forgot-password') ||
      lower.includes('login') ||
      lower.includes('register')
    );
  }

  private handleAuthError(err: any) {
    const errorMessage = err.error?.detail || err.error?.message || '';

    if (
      errorMessage.includes('تأكيد') ||
      errorMessage.includes('مفعل') ||
      errorMessage.includes('confirm') ||
      errorMessage.includes('verified')
    ) {
      Swal.fire({
        title: 'حسابك غير مفعل!',
        text: 'يجب تأكيد بريدك الإلكتروني لتتمكن من استخدام المنصة.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0058be',
        cancelButtonColor: '#75777d',
        confirmButtonText: 'الذهاب لتأكيد الحساب',
        cancelButtonText: 'إلغاء',
        customClass: { popup: 'rounded-xl font-body-md' },
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
