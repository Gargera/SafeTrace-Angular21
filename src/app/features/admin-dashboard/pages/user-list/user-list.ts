import { Component, computed, inject, signal } from '@angular/core';
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
import { RoleService } from '../../services/role.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-user-list',
  imports: [
    VerificationBadgeDirective,
    RoleBadgeDirective,
    BlockBadgeDirective,
    FormsModule,
    CommonModule,
    RouterModule,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
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
    verificationStatus: undefined,
    roleId: undefined,
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

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
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
      verificationStatus: undefined,
      roleId: undefined,
    });
    this.loadUsers();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.filter.update((f) => ({ ...f, pageNumber: page }));
      this.loadUsers();
    }
  }
}
