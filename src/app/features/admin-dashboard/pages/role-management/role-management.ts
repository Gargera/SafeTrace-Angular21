import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { CardComponent } from '../../../../shared/components/card/card';
import { TableSkeletonComponent } from '../../../../shared/components/skeletons/table-skeleton/table-skeleton.component';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { Permissions } from '../../../../core/constants/Permissions';
import { AuthService } from '../../../../core/services/auth.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CacheService } from '../../../../core/cache/cache.service';
import { DestroyRef } from '@angular/core';

import {
  PERMISSION_GROUPS_AR,
  PERMISSION_ACTIONS_AR,
  ALL_SYSTEM_PERMISSIONS,
} from '../../../../core/constants/dictionaries/permission.dictionary';
import Swal from 'sweetalert2';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { RolePermissionDto } from '../../models/Role/responses/RolePermissionDto';
import { RoleService } from '../../services/role.service';
import { RoleDto } from '../../models/Role/responses/RoleDto';
import { getRoleTranslationAr } from '../../../../core/constants/dictionaries/roles.dictionary';
import { UserRole } from '../../../../shared/enums/user-role';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';

interface PermissionGroup {
  groupName: string;
  groupTitle: string;
  icon: string;
  permissions: RolePermissionDto[];
}

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FormField, ButtonComponent, CardComponent, TableSkeletonComponent, ConfirmationModalComponent, HasPermissionDirective, HeaderComponent],
  templateUrl: './role-management.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleManagement implements OnInit {
  Permissions = Permissions;
  private authService = inject(AuthService);
  private roleService = inject(RoleService);
  private fb = inject(FormBuilder);
  private snackbar = inject(SnackbarService);
  private cacheService = inject(CacheService);
  private destroyRef = inject(DestroyRef);

  roles = signal<RoleDto[]>([]);
  selectedRoleId = signal<string>('');

  originalPermissionsList = signal<RolePermissionDto[]>(this.generateEmptyPermissions());
  permissionsList = signal<RolePermissionDto[]>(this.generateEmptyPermissions());

  expandedGroups = signal<Record<string, boolean>>({});
  isRootExpanded = signal<boolean>(true);

  isLoadingRoles = signal<boolean>(false);
  isLoadingTree = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isDeleting = signal<boolean>(false);
  isCreating = signal<boolean>(false);
  apiErrorMessage = signal<string>('');

  createRoleForm: FormGroup = this.fb.group({
    roleName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(/^[\u0600-\u06FF]+$/)]],
  });

  showConfirmModal = signal(false);
  modalConfig = signal({
    title: '',
    message: '',
    confirmText: '',
    icon: 'help_outline',
    variant: 'primary' as 'primary' | 'danger',
    action: () => {}
  });

  currentOpenModal = signal<'CREATE' | 'DELETE' | 'SAVE' | null>(null);

  openConfirmModal(title: string, message: string, confirmText: string, action: () => void, icon = 'help_outline', variant: 'primary' | 'danger' = 'primary', modalType: 'CREATE' | 'DELETE' | 'SAVE' | null = null) {
    this.modalConfig.set({ title, message, confirmText, icon, variant, action });
    this.currentOpenModal.set(modalType);
    this.showConfirmModal.set(true);
  }

  onConfirmModal() {
    this.showConfirmModal.set(false);
    this.currentOpenModal.set(null);
    this.modalConfig().action();
  }

  onCancelModal() {
    this.showConfirmModal.set(false);
    this.currentOpenModal.set(null);
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cacheService.set('RoleManagement_State', {
         selectedRoleId: this.selectedRoleId(),
         roleName: this.createRoleForm.value.roleName
      }, 300000);
    });
  }

  isReadOnly = computed(() => {
    const selectedRole = this.roles().find((r) => r.id === this.selectedRoleId());
    return selectedRole?.name === UserRole.SuperAdmin || !this.authService.hasPermission(this.Permissions.Roles.UpdateRolePermissions);
  });

  isDeletableRole = computed(() => {
    const selectedRole = this.roles().find((r) => r.id === this.selectedRoleId());
    if (!selectedRole) return false;
    const coreRoles = [UserRole.Admin, UserRole.Moderator, UserRole.SuperAdmin, UserRole.User, UserRole.VerifiedUser];
    return !coreRoles.includes(selectedRole.name);
  });

  groupedPermissions = computed<PermissionGroup[]>(() => {
    const list = this.permissionsList();
    const groupsMap = new Map<string, RolePermissionDto[]>();

    list.forEach((perm) => {
      const parts = perm.permissionValue.split('.');
      const groupName = parts[0];
      if (!groupsMap.has(groupName)) {
        groupsMap.set(groupName, []);
      }
      groupsMap.get(groupName)!.push(perm);
    });

    return Array.from(groupsMap.entries()).map(([groupName, perms]) => ({
      groupName,
      groupTitle: PERMISSION_GROUPS_AR[groupName]?.title || groupName,
      icon: PERMISSION_GROUPS_AR[groupName]?.icon || 'verified_user',
      permissions: perms,
    }));
  });

  totalSelected = computed(() => this.permissionsList().filter((p) => p.isSelected).length);
  totalPermissions = computed(() => this.permissionsList().length);

  isAllChecked = computed(
    () => this.totalPermissions() > 0 && this.totalSelected() === this.totalPermissions(),
  );
  isAllIndeterminate = computed(
    () => this.totalSelected() > 0 && this.totalSelected() < this.totalPermissions(),
  );

  dirtyGroups = computed(() => {
    const current = this.permissionsList();
    const original = this.originalPermissionsList();
    const dirtyMap: Record<string, boolean> = {};

    for (let i = 0; i < current.length; i++) {
      if (current[i].isSelected !== original[i].isSelected) {
        const groupName = current[i].permissionValue.split('.')[0];
        dirtyMap[groupName] = true;
      }
    }
    return dirtyMap;
  });

  hasChanges = computed(() => Object.keys(this.dirtyGroups()).length > 0);

  ngOnInit() {
    const state = this.cacheService.get<any>('RoleManagement_State');
    if (state) {
      if (state.roleName) {
        this.createRoleForm.patchValue({ roleName: state.roleName });
      }
      if (state.selectedRoleId) {
        this.selectedRoleId.set(state.selectedRoleId);
      }
    }
    this.loadRoles();
  }

  loadRoles() {
    this.isLoadingRoles.set(true);
    this.roleService.getAllRoles().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.roles.set(res.data);
          if (this.selectedRoleId()) {
            this.onRoleSelected(this.selectedRoleId());
          }
        }
        this.isLoadingRoles.set(false);
      },
      error: () => this.isLoadingRoles.set(false),
    });
  }

  onCreateRole() {
    if (this.isCreating()) return;
    this.createRoleForm.markAllAsTouched();
    if (this.createRoleForm.invalid) return;

    const dto = { ...this.createRoleForm.value };

    this.openConfirmModal(
      'تأكيد إنشاء الدور',
      'هل أنت متأكد من رغبتك في إنشاء هذا الدور؟',
      'تأكيد وإنشاء',
      () => {
        this.isCreating.set(true);
        this.roleService.createRole(dto).subscribe({
          next: () => {
            this.isCreating.set(false);
            this.createRoleForm.reset();
            this.cacheService.remove('RoleManagement_State');
            this.loadRoles();
            this.snackbar.success('تم إنشاء الدور بنجاح');
          },
          error: (err) => {
            this.isCreating.set(false);
            this.snackbar.error(extractErrorMessage(err, 'حدث خطأ أثناء الإنشاء.'));
          },
        });
      },
      'add_circle_outline',
      'primary',
      'CREATE'
    );
  }

  onDeleteRole() {
    if (!this.selectedRoleId() || this.isDeleting()) return;

    this.openConfirmModal(
      'تأكيد الحذف',
      'هل أنت متأكد من رغبتك في حذف هذا الدور؟ لا يمكن التراجع عن هذا الإجراء.',
      'حذف',
      () => {
        this.isDeleting.set(true);
        this.roleService.deleteRole(this.selectedRoleId()).subscribe({
          next: () => {
            this.isDeleting.set(false);
            this.selectedRoleId.set('');
            const emptyPerms = this.generateEmptyPermissions();
            this.permissionsList.set(emptyPerms);
            this.originalPermissionsList.set(emptyPerms.map((p) => ({ ...p })));
            this.loadRoles();
            this.snackbar.success('تم حذف الدور بنجاح');
          },
          error: (err) => {
            this.isDeleting.set(false);
            this.snackbar.error(extractErrorMessage(err, 'فشل حذف الدور'));
          },
        });
      },
      'delete',
      'danger',
      'DELETE'
    );
  }

  onRoleSelected(roleId: string, openModalType: 'CREATE' | 'DELETE' | 'SAVE' | null = null) {
    this.selectedRoleId.set(roleId);

    if (!roleId) {
      const emptyPerms = this.generateEmptyPermissions();
      this.permissionsList.set(emptyPerms);
      this.originalPermissionsList.set(emptyPerms.map((p) => ({ ...p })));
      this.expandedGroups.set({});
      this.isRootExpanded.set(true);
      return;
    }

    this.isLoadingTree.set(true);
    this.roleService.getRolePermissions(roleId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.permissionsList.set(res.data.permissions);
          this.originalPermissionsList.set(res.data.permissions.map((p: any) => ({ ...p })));
          this.expandedGroups.set({});
          this.isRootExpanded.set(true);

          if (openModalType === 'DELETE') {
            this.onDeleteRole();
          } else if (openModalType === 'SAVE') {
            this.savePermissions();
          } else if (openModalType === 'CREATE') {
            this.onCreateRole();
          }
        }
        this.isLoadingTree.set(false);
      },
      error: () => this.isLoadingTree.set(false),
    });
  }

  savePermissions() {
    if (!this.selectedRoleId() || !this.hasChanges() || this.isSaving()) return;

    this.openConfirmModal(
      'حفظ الصلاحيات',
      'هل أنت متأكد من رغبتك في تعديل صلاحيات هذا الدور؟ سيتم تطبيق هذا التغيير على جميع المستخدمين التابعين له.',
      'تأكيد وحفظ',
      () => {
        this.isSaving.set(true);
        const selectedValues = this.permissionsList()
          .filter((p) => p.isSelected)
          .map((p) => p.permissionValue);

        this.roleService
          .updateRolePermissions({
            roleId: this.selectedRoleId(),
            selectedPermissions: selectedValues,
          })
          .subscribe({
            next: () => {
              this.isSaving.set(false);
              this.originalPermissionsList.set(this.permissionsList().map((p) => ({ ...p })));
              this.snackbar.success('تم حفظ الصلاحيات');
            },
            error: (err) => {
              this.isSaving.set(false);
              this.snackbar.error(extractErrorMessage(err, 'فشل حفظ الصلاحيات'));
            },
          });
      },
      'save',
      'primary',
      'SAVE'
    );
  }

  resetAll() {
    this.permissionsList.set(this.originalPermissionsList().map((p) => ({ ...p })));
  }

  resetGroup(groupName: string) {
    this.permissionsList.update((list) =>
      list.map((p) => {
        if (p.permissionValue.startsWith(groupName + '.')) {
          const originalItem = this.originalPermissionsList().find(
            (o) => o.permissionValue === p.permissionValue,
          );
          return { ...p, isSelected: originalItem ? originalItem.isSelected : p.isSelected };
        }
        return p;
      }),
    );
  }

  toggleRootExpanded() {
    this.isRootExpanded.update((v) => !v);
  }

  toggleAllPermissions(event: Event) {
    if (this.isReadOnly()) return;
    const isChecked = (event.target as HTMLInputElement).checked;
    this.permissionsList.update((list) => list.map((p) => ({ ...p, isSelected: isChecked })));
  }

  toggleGroupExpanded(groupName: string) {
    this.expandedGroups.update((state) => ({ ...state, [groupName]: !state[groupName] }));
  }

  toggleGroupCheckbox(groupName: string, event: Event) {
    if (this.isReadOnly()) return;
    const isChecked = (event.target as HTMLInputElement).checked;
    this.permissionsList.update((list) =>
      list.map((p) =>
        p.permissionValue.startsWith(groupName + '.') ? { ...p, isSelected: isChecked } : p,
      ),
    );
  }

  togglePermission(permValue: string) {
    if (this.isReadOnly()) return;
    this.permissionsList.update((list) =>
      list.map((p) => (p.permissionValue === permValue ? { ...p, isSelected: !p.isSelected } : p)),
    );
  }

  isGroupChecked(groupName: string): boolean {
    const groupPerms = this.permissionsList().filter((p) =>
      p.permissionValue.startsWith(groupName + '.'),
    );
    return groupPerms.length > 0 && groupPerms.every((p) => p.isSelected);
  }

  isGroupIndeterminate(groupName: string): boolean {
    const groupPerms = this.permissionsList().filter((p) =>
      p.permissionValue.startsWith(groupName + '.'),
    );
    const checkedCount = groupPerms.filter((p) => p.isSelected).length;
    return checkedCount > 0 && checkedCount < groupPerms.length;
  }

  getActionName(permValue: string): string {
    const action = permValue.split('.')[1];
    return PERMISSION_ACTIONS_AR[action] || action;
  }

  getRoleName(roleName: string): string {
    return getRoleTranslationAr(roleName);
  }

  private generateEmptyPermissions(): RolePermissionDto[] {
    return ALL_SYSTEM_PERMISSIONS.map((p) => ({ permissionValue: p, isSelected: false }));
  }
}
