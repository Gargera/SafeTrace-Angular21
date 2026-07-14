import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

interface PermissionGroup {
  groupName: string;
  groupTitle: string;
  icon: string;
  permissions: UserPermissionDto[];
}

@Component({
  selector: 'app-user-details',
  imports: [CommonModule, FormsModule, VerificationBadgeDirective, RoleBadgeDirective, BlockBadgeDirective, ButtonComponent, CardComponent, FormField],
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

  userId = signal<string>('');
  user = signal<GetUserByIdDto | null>(null);
  selectedRole = signal<string>('');
  roles = signal<RoleDto[]>([]);
  
  originalPermissionsList = signal<UserPermissionDto[]>(this.generateEmptyPermissions());
  permissionsList = signal<UserPermissionDto[]>(this.generateEmptyPermissions());
  
  expandedGroups = signal<Record<string, boolean>>({});
  isRootExpanded = signal<boolean>(true);
  
  isLoading = signal<boolean>(true);
  isSavingPerms = signal<boolean>(false);
  isActionLoading = signal<boolean>(false);

  verificationStatusEnum = VerificationStatus;

  isCurrentUser = computed(() => {
    return this.authService.getCurrentUserId() === this.userId();
  });

  isInternalRole = computed(() => {
    const role = this.user()?.role;
    return role === 'Admin' || role === 'Moderator';
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

  loadRoles() {
    this.roleService.getAllRoles().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.roles.set(res.data);
        }
      }
    });
  }

  loadUserData() {
    this.isLoading.set(true);
    
    this.userService.getUserById(this.userId()).subscribe({
      next: (res) => {
        if (res.success) {
          this.user.set(res.data);
          this.selectedRole.set(res.data?.role || '');
          this.loadUserPermissions();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackbar.error(err.error?.detail || 'فشل في تحميل بيانات المستخدم.');
      }
    });
  }

  loadUserPermissions() {
    this.userService.getUserPermissions(this.userId()).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.permissionsList.set(res.data.permissions);
          this.originalPermissionsList.set(this.permissionsList().map(p => ({...p})));
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onChangeRole(newRole: string) {
    if (!newRole || newRole === this.user()?.role) return;

    Swal.fire({
      title: 'تغيير دور المستخدم',
      text: `هل أنت متأكد من تغيير دور هذا المستخدم إلى "${this.getRoleName(newRole)}"؟ قد يؤثر ذلك على حالة توثيق الحساب.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، تغيير',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#0058be',
      customClass: { popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl' }
    }).then((result) => {
      if (result.isConfirmed) {
        this.executeAction(this.userService.changeUserRole({ userId: this.userId(), newRole: newRole }), 'تم تغيير دور المستخدم بنجاح.');
      }
    });
  }

  onApprove() {
    Swal.fire({
      title: 'قبول التوثيق',
      text: 'هل أنت متأكد من قبول هوية هذا المستخدم؟ سيحصل على صلاحيات "مستخدم موثق".',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم، قبول',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#00a292',
      customClass: { popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl' }
    }).then((result) => {
      if (result.isConfirmed) {
        this.executeAction(this.userService.approveUser(this.userId()), 'تم توثيق حساب المستخدم بنجاح.');
      }
    });
  }

  onReject() {
    Swal.fire({
      title: 'رفض التوثيق',
      text: 'هل أنت متأكد من رفض هوية هذا المستخدم؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، رفض',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ba1a1a',
      customClass: { popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl' }
    }).then((result) => {
      if (result.isConfirmed) {
        this.executeAction(this.userService.rejectUser(this.userId()), 'تم رفض طلب التوثيق.');
      }
    });
  }

  onToggleBlock() {
    const isCurrentlyBlocked = this.user()?.isBlocked;
    const actionText = isCurrentlyBlocked ? 'فك الحظر' : 'حظر';
    const color = isCurrentlyBlocked ? '#00a292' : '#ba1a1a';

    Swal.fire({
      title: `${actionText} المستخدم`,
      text: `هل أنت متأكد من رغبتك في ${actionText} هذا المستخدم؟`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `نعم، ${actionText}`,
      cancelButtonText: 'إلغاء',
      confirmButtonColor: color,
      customClass: { popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl' }
    }).then((result) => {
      if (result.isConfirmed) {
        this.executeAction(this.userService.toggleBlockStatus(this.userId()), `تم ${actionText} المستخدم بنجاح.`);
      }
    });
  }

  private executeAction(observable: any, successMessage: string) {
    this.isActionLoading.set(true);

    Swal.fire({
      title: 'جاري التنفيذ...',
      text: 'يرجى الانتظار بينما نقوم بمعالجة طلبك.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    observable.subscribe({
      next: () => {
        this.isActionLoading.set(false);
        Swal.close();
        this.snackbar.success(successMessage);
        this.loadUserData();
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        Swal.close();
        this.snackbar.error(err.error?.detail || err.error?.message || 'حدث خطأ غير متوقع. قد لا تملك الصلاحية الكافية.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  savePermissions() {
    if (!this.hasChanges() || !this.canManageUser()) return;

    Swal.fire({
      title: 'حفظ الصلاحيات الاستثنائية',
      text: 'هل أنت متأكد من تعديل الصلاحيات الفردية لهذا المستخدم؟',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم، حفظ',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#0058be',
      customClass: { popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl' }
    }).then((result) => {
      if (result.isConfirmed) {
        this.isSavingPerms.set(true);
        const selectedValues = this.permissionsList().filter(p => p.isSelected).map(p => p.permissionValue);
        
        Swal.fire({
          title: 'جاري الحفظ...',
          text: 'يرجى الانتظار...',
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });

        this.userService.assignUserPermissions({ userId: this.userId(), selectedPermissions: selectedValues }).subscribe({
          next: () => {
            this.isSavingPerms.set(false);
            Swal.close();
            this.originalPermissionsList.set(this.permissionsList().map(p => ({...p})));
            this.snackbar.success('تم تحديث صلاحيات المستخدم');
          },
          error: (err) => {
            this.isSavingPerms.set(false);
            Swal.close();
            this.snackbar.error(err.error?.detail || 'فشل حفظ الصلاحيات. تأكد من امتلاكك الصلاحية اللازمة.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      }
    });
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
