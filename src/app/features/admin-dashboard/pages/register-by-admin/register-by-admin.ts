import { FormField } from '../../../../shared/components/form-field/form-field';
import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { UserService } from '../../services/user.service';
import { RoleService } from '../../services/role.service';
import { RoleDto } from '../../models/Role/responses/RoleDto';
import { getRoleTranslationAr } from '../../../../core/constants/roles.dictionary';



import { ButtonComponent } from '../../../../shared/components/button/button';
import { CardComponent } from '../../../../shared/components/card/card';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
@Component({
  selector: 'app-register-by-admin',
  imports: [FormField, ReactiveFormsModule, RouterModule, CommonModule, ButtonComponent, CardComponent, ConfirmationModalComponent],
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

  showConfirmModal = signal(false);
  modalConfig = signal({
    title: '',
    message: '',
    confirmText: '',
    icon: 'help_outline',
    variant: 'primary' as 'primary' | 'danger',
    action: () => {}
  });

  openConfirmModal(title: string, message: string, confirmText: string, action: () => void, icon = 'help_outline', variant: 'primary' | 'danger' = 'primary') {
    this.modalConfig.set({ title, message, confirmText, icon, variant, action });
    this.showConfirmModal.set(true);
  }

  onConfirmModal() {
    this.showConfirmModal.set(false);
    this.modalConfig().action();
  }

  roles = signal<RoleDto[]>([]);

  registerForm: FormGroup = this.fb.group({
    fName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern('^[a-zA-Z\u0600-\u06FF]+$')]],
    lName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern('^[a-zA-Z\u0600-\u06FF]+( [a-zA-Z\u0600-\u06FF]+)*$')]],
    email: ['', [Validators.required, Validators.email, Validators.pattern('^\\S+$')]],
    phoneNumber: ['', [Validators.pattern('^01[0125][0-9]{8}$')]],
    role: ['', Validators.required],
  });

  ngOnInit() {
    this.fetchRoles();
  }

  fetchRoles() {
    this.roleService.getAllRoles().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const filteredRoles = res.data.filter(r => r.name !== 'SuperAdmin');
          this.roles.set(filteredRoles);
        }
      },
    });
  }


  onSubmit() {
    this.registerForm.markAllAsTouched();
    this.apiErrorMessage.set('');

    if (this.registerForm.invalid) return;

    this.openConfirmModal(
      'تأكيد الإنشاء',
      'هل أنت متأكد من رغبتك في إنشاء هذا الحساب بالصلاحيات المحددة؟',
      'تأكيد وإنشاء',
      () => {
        this.isLoading.set(true);

        const formData = { ...this.registerForm.value };
        formData.fName = formData.fName.trim();
        formData.lName = formData.lName.trim();
        if (!formData.phoneNumber) {
          delete formData.phoneNumber;
        }

        this.userService.registerByAdmin(formData).subscribe({
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
      },
      'person_add',
      'primary'
    );
  }

  getRoleName(roleName: string): string {
    return getRoleTranslationAr(roleName);
  }
}
