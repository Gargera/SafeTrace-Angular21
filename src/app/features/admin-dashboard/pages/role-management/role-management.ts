import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { SelectInputComponent } from '../../../../shared/components/select-input/select-input';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { TextInputComponent } from '../../../../shared/components/text-input/text-input';
import { CardComponent } from '../../../../shared/components/card/card';

import {
  PERMISSION_GROUPS_AR,
  PERMISSION_ACTIONS_AR,
  ALL_SYSTEM_PERMISSIONS,
} from '../../../../core/constants/permission.dictionary';
import Swal from 'sweetalert2';
import { SnackbarService } from '../../../../core/services/toast.service';
import { RolePermissionDto } from '../../models/Role/RolePermissionDto';
import { RoleService } from '../../services/role.service';
import { RoleDto } from '../../models/Role/RoleDto';
import { getRoleTranslationAr } from '../../../../core/constants/roles.dictionary';

interface PermissionGroup {
  groupName: string;
  groupTitle: string;
  icon: string;
  permissions: RolePermissionDto[];
}

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SelectInputComponent, ButtonComponent, TextInputComponent, CardComponent],
  templateUrl: './role-management.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleManagement implements OnInit {
  private roleService = inject(RoleService);
  private fb = inject(FormBuilder);
  private snackbar = inject(SnackbarService);

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
  apiErrorMessage = signal<string>('');

  createRoleForm: FormGroup = this.fb.group({
    roleName: [
      '',
      [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z0-9_ ]+$/)],
    ],
  });

  isReadOnly = computed(() => {
    const selectedRole = this.roles().find((r) => r.id === this.selectedRoleId());
    return selectedRole?.name === 'Admin';
  });

  isDeletableRole = computed(() => {
    const selectedRole = this.roles().find((r) => r.id === this.selectedRoleId());
    if (!selectedRole) return false;
    const coreRoles = ['Admin', 'User', 'VerifiedUser', 'Moderator'];
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
    this.loadRoles();
  }

  loadRoles() {
    this.isLoadingRoles.set(true);
    this.roleService.getAllRoles().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.roles.set(res.data);
        }
        this.isLoadingRoles.set(false);
      },
      error: () => this.isLoadingRoles.set(false),
    });
  }

  onCreateRole() {
    this.apiErrorMessage.set('');
    if (this.createRoleForm.invalid) {
      this.createRoleForm.markAllAsTouched();
      return;
    }

    const dto = { roleName: this.createRoleForm.value.roleName.trim() };

    Swal.fire({
      title: 'إنشاء دور جديد',
      text: `هل أنت متأكد من إنشاء دور جديد باسم "${dto.roleName}" في منصة لقاء؟`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم، إنشاء',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#0058be',
      cancelButtonColor: '#0b1c30',
      customClass: { popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl' },
    }).then((result) => {
      if (result.isConfirmed) {
        this.roleService.createRole(dto).subscribe({
          next: () => {
            this.createRoleForm.reset();
            this.loadRoles();
            this.snackbar.success('تم إنشاء الدور بنجاح');
          },
          error: (err) => {
            this.snackbar.error(err.error?.detail || err.error?.message || 'حدث خطأ أثناء الإنشاء.');
          },
        });
      }
    });
  }

  onDeleteRole() {
    if (!this.selectedRoleId() || !this.isDeletableRole()) return;

    Swal.fire({
      title: 'تأكيد الحذف',
      text: 'هل أنت متأكد من حذف هذا الدور نهائياً من منصة لقاء؟ لا يمكن التراجع عن هذا الإجراء.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، حذف',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ba1a1a',
      cancelButtonColor: '#0b1c30',
      customClass: { popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl' },
    }).then((result) => {
      if (result.isConfirmed) {
        this.isDeleting.set(true);
        this.roleService.deleteRole(this.selectedRoleId()).subscribe({
          next: () => {
            this.isDeleting.set(false);
            this.selectedRoleId.set('');
            const emptyPerms = this.generateEmptyPermissions();
            this.permissionsList.set(emptyPerms);
            this.originalPermissionsList.set(emptyPerms.map((p) => ({ ...p })));
            this.expandedGroups.set({});
            this.isRootExpanded.set(true);
            this.loadRoles();
            this.snackbar.success('تم حذف الدور بنجاح');
          },
          error: (err) => {
            this.isDeleting.set(false);
            this.snackbar.error(err.error?.detail || err.error?.message || 'فشل حذف الدور');
          },
        });
      }
    });
  }

  onRoleSelected(roleId: string) {
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
        }
        this.isLoadingTree.set(false);
      },
      error: () => this.isLoadingTree.set(false),
    });
  }

  savePermissions() {
    if (!this.selectedRoleId() || this.isReadOnly() || !this.hasChanges()) return;

    Swal.fire({
      title: 'حفظ الصلاحيات',
      text: 'هل أنت متأكد من حفظ التعديلات على صلاحيات هذا الدور في منصة لقاء؟',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم، حفظ',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#0058be',
      cancelButtonColor: '#0b1c30',
      customClass: { popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl' },
    }).then((result) => {
      if (result.isConfirmed) {
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
              this.snackbar.error(err.error?.detail || 'فشل حفظ الصلاحيات');
            },
          });
      }
    });
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
