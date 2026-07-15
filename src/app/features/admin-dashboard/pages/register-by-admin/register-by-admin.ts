import { FormField } from '../../../../shared/components/form-field/form-field';
import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SnackbarService } from '../../../../core/services/toast.service';
import { UserService } from '../../services/user.service';
import { RoleService } from '../../services/role.service';
import { RoleDto } from '../../models/Role/RoleDto';
import { getRoleTranslationAr } from '../../../../core/constants/roles.dictionary';



import { ButtonComponent } from '../../../../shared/components/button/button';
import { CardComponent } from '../../../../shared/components/card/card';
@Component({
  selector: 'app-register-by-admin',
  imports: [FormField, ReactiveFormsModule, RouterModule, CommonModule, ButtonComponent, CardComponent],
  templateUrl: './register-by-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterByAdmin implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);

  isLoading = signal<boolean>(false);
  apiErrorMessage = signal<string>('');
  isPasswordVisible = signal<boolean>(false);

  roles = signal<RoleDto[]>([]);

  registerForm: FormGroup = this.fb.group({
    fName: ['', [Validators.required, Validators.maxLength(100)]],
    lName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern('^01[0125][0-9]{8}$')]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$')],
    ],
    role: ['', Validators.required],
  });

  ngOnInit() {
    this.fetchRoles();
  }

  fetchRoles() {
    this.roleService.getAllRoles().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.roles.set(res.data);
        }
      },
    });
  }

  togglePasswordVisibility() {
    this.isPasswordVisible.update((v) => !v);
  }

  onSubmit() {
    this.registerForm.markAllAsTouched();
    this.apiErrorMessage.set('');

    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.userService.registerByAdmin(this.registerForm.value).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.snackbar.success('تمت إضافة المستخدم وتعيين الصلاحيات الخاصة به في النظام.');
        this.router.navigate(['/admin/users']);
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
          this.apiErrorMessage.set(
            err.error?.detail || err.error?.message || 'حدث خطأ أثناء إنشاء الحساب.',
          );
        }
      },
    });
  }

  getRoleName(roleName: string): string {
    return getRoleTranslationAr(roleName);
  }
}
