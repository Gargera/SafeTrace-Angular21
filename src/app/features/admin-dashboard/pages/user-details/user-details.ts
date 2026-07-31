import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ALL_SYSTEM_PERMISSIONS, PERMISSION_ACTIONS_AR, PERMISSION_GROUPS_AR } from '../../../../core/constants/permission.dictionary';
import { environment } from '../../../../../environments/environment';
import { SnackbarService } from '../../../../core/services/toast.service';
import { UserService } from '../../services/user.service';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserPermissionDto } from '../../models/User/UserPermissionDto';
import { getRoleTranslationAr } from '../../../../core/constants/roles.dictionary';
import { GetUserByIdDto } from '../../models/User/GetUserByIdDto';
import { RoleDto } from '../../models/Role/RoleDto';
import { VerificationStatus } from '../../../../shared/enums/verification-status';
import { VerificationBadgeDirective } from "../../../../shared/directives/verification-badge-directive";
import { RoleBadgeDirective } from "../../../../shared/directives/role-badge-directive";
import { BlockBadgeDirective } from "../../../../shared/directives/block-badge-directive";
import Swal from 'sweetalert2';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { CardComponent } from '../../../../shared/components/card/card';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { Permissions } from '../../../../core/constants/Permissions';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
interface PermissionGroup {
  groupName: string;
  groupTitle: string;
  icon: string;
  permissions: UserPermissionDto[];
}

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, VerificationBadgeDirective, RoleBadgeDirective, BlockBadgeDirective, ButtonComponent, CardComponent, FormField, LoadingSpinnerComponent, ConfirmationModalComponent, HasPermissionDirective, CaseHeaderComponent],
  templateUrl: './user-details.html',
  styleUrl: './user-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserDetails implements OnInit {
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  public authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private snackbar = inject(SnackbarService);
  Permissions = Permissions;

  userId = signal<string>('');
  user = signal<GetUserByIdDto | null>(null);
  selectedRole = signal<string>('');
  roles = signal<RoleDto[]>([]);
  
  originalPermissionsList = signal<UserPermissionDto[]>(this.generateEmptyPermissions());
  permissionsList = signal<UserPermissionDto[]>(this.generateEmptyPermissions());
  
  expandedGroups = signal<Record<string, boolean>>({});
  isRootExpanded = signal<boolean>(true);
  
  isUserLoading = signal<boolean>(true);
  isPermissionsLoading = signal<boolean>(true);
  isSavingPerms = signal<boolean>(false);
  loadingAction = signal<string | null>(null);
  selectedZoomImage = signal<string | null>(null);

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

  verificationStatusEnum = VerificationStatus;

  isCurrentUser = computed(() => {
    return this.authService.getCurrentUserId() === this.userId();
  });

  isInternalRole = computed(() => {
    const role = this.user()?.role;
    return role !== 'User';
  });

  canManageUser = computed(() => {
    if (!this.user() || this.isCurrentUser()) return false;
    return true;
  });

  groupedPermissions = computed<PermissionGroup[]>(() => {
    const list = this.permissionsList();
    const groupsMap = new Map<string, UserPermissionDto[]>();

    list.forEach(perm => {
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
      permissions: perms
    }));
  });

  totalSelected = computed(() => this.permissionsList().filter(p => p.isSelected).length);
  totalPermissions = computed(() => this.permissionsList().length);
  isAllChecked = computed(() => this.totalPermissions() > 0 && this.totalSelected() === this.totalPermissions());
  isAllIndeterminate = computed(() => this.totalSelected() > 0 && this.totalSelected() < this.totalPermissions());

  dirtyGroups = computed(() => {
    const current = this.permissionsList();
    const original = this.originalPermissionsList();
    const dirtyMap: Record<string, boolean> = {};
    for (let i = 0; i < current.length; i++) {
      if (current[i].isSelected !== original[i].isSelected) {
        dirtyMap[current[i].permissionValue.split('.')[0]] = true;
      }
    }
    return dirtyMap;
  });

  hasChanges = computed(() => Object.keys(this.dirtyGroups()).length > 0);

  ngOnInit() {
    this.loadRoles();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.userId.set(id);
        this.loadUserData();
      }
    });
  }

  goBack() {
    this.location.back();
  }

  openImageZoom(imagePath: string | undefined) {
    if (!imagePath) return;
    this.selectedZoomImage.set(this.getImageUrl(imagePath));
    document.body.style.overflow = 'hidden';
  }

  closeImageZoom() {
    this.selectedZoomImage.set(null);
    document.body.style.overflow = '';
  }

  loadRoles() {
    this.roleService.getAllRoles().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const filteredRoles = res.data.filter(r => r.name !== 'SuperAdmin');
          this.roles.set(filteredRoles);
        }
      }
    });
  }

  loadUserData() {
    this.isUserLoading.set(true);
    this.isPermissionsLoading.set(true);
    
    this.userService.getUserById(this.userId()).subscribe({
      next: (res) => {
        if (res.success) {
          this.user.set(res.data);
          this.selectedRole.set(res.data?.role || '');
        }
        this.isUserLoading.set(false);
      },
      error: (err) => {
        this.isUserLoading.set(false);
        this.snackbar.error(err.error?.detail || 'فشل في تحميل بيانات المستخدم.');
      }
    });

    this.loadUserPermissions();
  }

  loadUserPermissions() {
    this.userService.getUserPermissions(this.userId()).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.permissionsList.set(res.data.permissions);
          this.originalPermissionsList.set(this.permissionsList().map(p => ({...p})));
        }
        this.isPermissionsLoading.set(false);
      },
      error: () => this.isPermissionsLoading.set(false)
    });
  }

  onChangeRole(newRole: string) {
    if (this.selectedRole() === this.user()?.role) return;

    this.openConfirmModal(
      'تأكيد تغيير الدور',
      `هل أنت متأكد من رغبتك في تغيير دور المستخدم إلى ${this.getRoleName(newRole)}؟`,
      'تغيير',
      () => {
        this.executeAction(this.userService.changeUserRole({ userId: this.userId(), newRole: newRole }), 'تم تغيير دور المستخدم بنجاح.', 'changeRole');
      },
      'manage_accounts',
      'primary'
    );
  }

  onApprove() {
    this.openConfirmModal(
      'تأكيد توثيق الحساب',
      'هل أنت متأكد من الموافقة على توثيق هذا الحساب؟',
      'موافقة وتوثيق',
      () => {
        this.executeAction(this.userService.approveUser(this.userId()), 'تم توثيق حساب المستخدم بنجاح.', 'approve');
      },
      'verified_user',
      'primary'
    );
  }

  rejectReason = signal<string>('');

  onReject() {
    this.rejectReason.set('');
    this.openConfirmModal(
      'تأكيد رفض الحساب',
      'يرجى كتابة سبب رفض توثيق هذا الحساب (اختياري):',
      'رفض',
      () => {
        const reason = this.rejectReason()?.trim() || '';
        this.executeAction(this.userService.rejectUser(this.userId(), reason), 'تم رفض طلب التوثيق بنجاح وإرسال السبب.', 'reject');
      },
      'cancel',
      'danger'
    );
  }

  blockReason = signal<string>('');

  onToggleBlock() {
    const isBlocking = !this.user()?.isBlocked;
    const actionText = isBlocking ? 'حظر' : 'فك حظر';
    
    if (isBlocking) {
      this.blockReason.set('');
    }

    this.openConfirmModal(
      `تأكيد ${actionText} المستخدم`,
      isBlocking ? 'يرجى كتابة سبب حظر هذا الحساب (اختياري):' : `هل أنت متأكد من ${actionText} هذا المستخدم؟`,
      actionText,
      () => {
        const reason = isBlocking ? (this.blockReason()?.trim() || '') : '';
        this.executeAction(this.userService.toggleBlockStatus(this.userId(), reason), `تم ${actionText} المستخدم بنجاح.`, 'block');
      },
      isBlocking ? 'block' : 'lock_open',
      isBlocking ? 'danger' : 'primary'
    );
  }

  private executeAction(observable: any, successMessage: string, actionName: string) {
    this.loadingAction.set(actionName);

    observable.subscribe({
      next: () => {
        this.loadingAction.set(null);
        this.snackbar.success(successMessage);
        this.loadUserData();
      },
      error: (err: any) => {
        this.loadingAction.set(null);
        this.snackbar.error(err.error?.detail || err.error?.message || 'حدث خطأ غير متوقع. قد لا تملك الصلاحية الكافية.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  savePermissions() {
    if (!this.hasChanges()) return;

    this.openConfirmModal(
      'حفظ الصلاحيات',
      'هل أنت متأكد من تحديث صلاحيات هذا المستخدم بشكل استثنائي؟',
      'حفظ التعديلات',
      () => {
        this.isSavingPerms.set(true);
        const selectedValues = this.permissionsList().filter(p => p.isSelected).map(p => p.permissionValue);

        this.userService.assignUserPermissions({ userId: this.userId(), selectedPermissions: selectedValues }).subscribe({
          next: () => {
            this.isSavingPerms.set(false);
            this.originalPermissionsList.set(this.permissionsList().map(p => ({...p})));
            this.snackbar.success('تم تحديث صلاحيات المستخدم');
          },
          error: (err) => {
            this.isSavingPerms.set(false);
            this.snackbar.error(err.error?.detail || 'فشل حفظ الصلاحيات. تأكد من امتلاكك الصلاحية اللازمة.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      },
      'admin_panel_settings',
      'primary'
    );
  }

  resetAll() {
    this.permissionsList.set(this.originalPermissionsList().map(p => ({...p})));
  }

  resetGroup(groupName: string) {
    this.permissionsList.update(list => list.map(p => {
      if (p.permissionValue.startsWith(groupName + '.')) {
        const originalItem = this.originalPermissionsList().find(o => o.permissionValue === p.permissionValue);
        return { ...p, isSelected: originalItem ? originalItem.isSelected : p.isSelected };
      }
      return p;
    }));
  }

  toggleRootExpanded() {
    this.isRootExpanded.update(v => !v);
  }

  toggleAllPermissions(event: Event) {
    if (!this.canManageUser()) return;
    const isChecked = (event.target as HTMLInputElement).checked;
    this.permissionsList.update(list => list.map(p => ({ ...p, isSelected: isChecked })));
  }

  toggleGroupExpanded(groupName: string) {
    this.expandedGroups.update(state => ({ ...state, [groupName]: !state[groupName] }));
  }

  toggleGroupCheckbox(groupName: string, event: Event) {
    if (!this.canManageUser()) return;
    const isChecked = (event.target as HTMLInputElement).checked;
    this.permissionsList.update(list => list.map(p => p.permissionValue.startsWith(groupName + '.') ? { ...p, isSelected: isChecked } : p));
  }

  togglePermission(permValue: string) {
    if (!this.canManageUser()) return;
    this.permissionsList.update(list => list.map(p => p.permissionValue === permValue ? { ...p, isSelected: !p.isSelected } : p));
  }

  isGroupChecked(groupName: string): boolean {
    const groupPerms = this.permissionsList().filter(p => p.permissionValue.startsWith(groupName + '.'));
    return groupPerms.length > 0 && groupPerms.every(p => p.isSelected);
  }

  isGroupIndeterminate(groupName: string): boolean {
    const groupPerms = this.permissionsList().filter(p => p.permissionValue.startsWith(groupName + '.'));
    const checkedCount = groupPerms.filter(p => p.isSelected).length;
    return checkedCount > 0 && checkedCount < groupPerms.length;
  }

  getActionName(permValue: string): string {
    return PERMISSION_ACTIONS_AR[permValue.split('.')[1]] || permValue.split('.')[1];
  }

  getRoleName(roleName: string | undefined): string {
    return getRoleTranslationAr(roleName);
  }
  
  getImageUrl(path: string | undefined): string {
    if (!path) return '';
    return path.startsWith('http') ? path : `${environment.baseUrl}/${path.replace(/^\//, '')}`;
  }

  private generateEmptyPermissions(): UserPermissionDto[] {
    return ALL_SYSTEM_PERMISSIONS.map(p => ({ permissionValue: p, isSelected: false }));
  }
}
