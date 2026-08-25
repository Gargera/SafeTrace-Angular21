import { FormField } from '../../../../shared/components/form-field/form-field';
import { Component, inject, signal, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { UserService } from '../../services/user.service';
import { RoleService } from '../../services/role.service';
import { RoleDto } from '../../models/Role/responses/RoleDto';
import { getRoleTranslationAr } from '../../../../core/constants/dictionaries/roles.dictionary';
import { egyptianPhone } from '../../../../shared/validators/egyptian-phone.validator';
import { CacheService } from '../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';


import { ButtonComponent } from '../../../../shared/components/button/button';
import { CardComponent } from '../../../../shared/components/card/card';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';
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
  private cacheService = inject(CacheService);
  private destroyRef = inject(DestroyRef);

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
    this.modalConfig().action();
  }

  onCancelModal() {
    this.showConfirmModal.set(false);
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cacheService.set('RegisterByAdmin_State', {
        formValue: this.registerForm.value
      }, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);
    });
  }

  roles = signal<RoleDto[]>([]);

  registerForm: FormGroup = this.fb.group({
    fName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[\u0600-\u06FF]+(\s+)?$/)]],
    lName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[\u0600-\u06FF]+(\s[\u0600-\u06FF]+)*(\s+)?$/)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern('^\\S+$')]],
    phoneNumber: ['', [egyptianPhone()]],
    role: ['', Validators.required],
  });

  ngOnInit() {
    this.fetchRoles();

    const state = this.cacheService.get<any>('RegisterByAdmin_State');
    if (state && state.formValue) {
      this.registerForm.patchValue(state.formValue);
    }
  }

  fetchRoles() {
    this.roleService.getAllRoles().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const filteredRoles = res.data.filter(r => r.name !== 'SuperAdmin');
          this.roles.set(filteredRoles);
        }
      },
      error: (err) => {
        this.snackbar.error(extractErrorMessage(err, 'تعذر تحميل الأدوار'));
      }
    });
  }


  onSubmit() {
    if (this.isLoading()) return;
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
            this.cacheService.remove('RegisterByAdmin_State');
            this.snackbar.success('تمت إضافة المستخدم وتعيين الصلاحيات الخاصة به في النظام.');
            this.onCancelModal();
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
                extractErrorMessage(err, 'حدث خطأ أثناء إنشاء الحساب.'),
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
