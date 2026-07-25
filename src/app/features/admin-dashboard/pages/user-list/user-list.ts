import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { GetUserDto } from '../../models/User/GetUserDto';
import { RoleDto } from '../../models/Role/RoleDto';
import { UserFilterDto } from '../../models/User/UserFilterDto';
import { VerificationStatus } from '../../../../shared/enums/verification-status';
import { VerificationBadgeDirective } from '../../../../shared/directives/verification-badge-directive';
import { RoleBadgeDirective } from '../../../../shared/directives/role-badge-directive';
import { BlockBadgeDirective } from '../../../../shared/directives/block-badge-directive';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { getRoleTranslationAr } from '../../../../core/constants/roles.dictionary';
import { RoleService } from '../../services/role.service';
import { UserService } from '../../services/user.service';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { CardComponent } from '../../../../shared/components/card/card';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { UserStatisticsDto } from '../../models/User/UserStatisticsDto';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { SnackbarService } from '../../../../core/services/toast.service';
import { ReportService } from '../../services/report.service';

import { Permissions } from '../../../../core/constants/Permissions';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-user-list',
  imports: [
    VerificationBadgeDirective,
    RoleBadgeDirective,
    BlockBadgeDirective,
    FormsModule,
    CommonModule,
    RouterModule,
    FormField,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    CaseHeaderComponent,
    HasPermissionDirective,
    PaginationComponent
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserList {
  public authService = inject(AuthService);
  Permissions = Permissions;
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private readonly router = inject(Router);
  private toast = inject(SnackbarService);
  private reportService = inject(ReportService);

  users = signal<GetUserDto[]>([]);
  roles = signal<RoleDto[]>([]);
  totalCount = signal<number>(0);
  totalPages = signal<number>(0);
  isLoading = signal<boolean>(false);
  loadingStats = signal<boolean>(true);
  statistics = signal<UserStatisticsDto | null>(null);

  filter = signal<UserFilterDto>({
    pageNumber: 1,
    pageSize: 10,
    searchTerm: '',
    verificationStatus: '' as any,
    roleId: '' as any,
    isBlocked: '' as any,
  });

  private searchSubject = new Subject<string>();
  VerificationStatusEnum = VerificationStatus;

  ngOnInit() {
    this.loadRoles();
    this.loadUsers();
    this.loadStatistics();

    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((term) => {
      this.updateFilter({ searchTerm: term, pageNumber: 1 });
    });
  }

  loadRoles() {
    this.roleService.getAllRoles().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.roles.set(res.data);
        }
      },
    });
  }

  loadUsers() {
    this.isLoading.set(true);
    this.userService.getAllUsers(this.filter()).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.users.set(res.data.items);
          this.totalCount.set(res.data.totalCount);
          this.totalPages.set(res.data.totalPages);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  navigateToCreateUser(): void {
    this.router.navigate(['/admin/users/registerByAdmin']);
  }

  onSearchChange(value: string) {
    this.searchSubject.next(value);
  }

  updateFilter(partialFilter: Partial<UserFilterDto>) {
    this.filter.update((f) => ({
      ...f,
      ...partialFilter,
      pageNumber: partialFilter.pageNumber ?? 1,
    }));
    this.loadUsers();
  }

  resetFilters() {
    this.filter.set({
      pageNumber: 1,
      pageSize: 10,
      searchTerm: '',
      verificationStatus: '' as any,
      roleId: '' as any,
      isBlocked: '' as any,
    });
    this.loadUsers();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.filter.update((f) => ({ ...f, pageNumber: page }));
      this.loadUsers();
    }
  }

  getRoleName(roleName: string): string {
    return getRoleTranslationAr(roleName);
  }

  loadStatistics() {
    this.loadingStats.set(true);
    this.userService.getUsersStatistics().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.statistics.set(res.data);
        } else {
          this.toast.error(res.message || 'فشل تحميل الإحصائيات');
        }
        this.loadingStats.set(false);
      },
      error: () => {
        this.toast.error('تعذر الاتصال بالخادم لتحميل الإحصائيات');
        this.loadingStats.set(false);
      }
    });
  }

  navigateToRegister() {
    this.router.navigate(['/admin/users/registerByAdmin']);
  }

 downloadReport(): void {
  this.reportService
    .generateUsersPdfReport(this.filter())
    .subscribe(response => {
      this.reportService.download(response);
    });
}
}
