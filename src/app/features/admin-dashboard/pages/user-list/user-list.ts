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
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { getRoleTranslationAr } from '../../../../core/constants/roles.dictionary';
import { RoleService } from '../../services/role.service';
import { UserService } from '../../services/user.service';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { CardComponent } from '../../../../shared/components/card/card';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

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
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserList {
  public authService = inject(AuthService);
  private userService = inject(UserService);
  private roleService = inject(RoleService);

  users = signal<GetUserDto[]>([]);
  roles = signal<RoleDto[]>([]);
  totalCount = signal<number>(0);
  totalPages = signal<number>(0);
  isLoading = signal<boolean>(false);

  filter = signal<UserFilterDto>({
    pageNumber: 1,
    pageSize: 10,
    searchTerm: '',
    verificationStatus: '' as any,
    roleId: '' as any,
    isBlocked: '' as any,
  });

  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  private searchSubject = new Subject<string>();
  VerificationStatusEnum = VerificationStatus;

  ngOnInit() {
    this.loadRoles();
    this.loadUsers();

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
}
