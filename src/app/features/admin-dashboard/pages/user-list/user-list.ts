import { Component, computed, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, switchMap, tap, catchError, EMPTY } from 'rxjs';
import { GetUserDto } from '../../models/User/responses/GetUserDto';
import { RoleDto } from '../../models/Role/responses/RoleDto';
import { UserFilterDto } from '../../models/User/requests/UserFilterDto';
import { VerificationStatus } from '../../../../shared/enums/verification-status';
import { VerificationBadgeDirective } from '../../../../shared/directives/verification-badge-directive';
import { RoleBadgeDirective } from '../../../../shared/directives/role-badge-directive';
import { BlockBadgeDirective } from '../../../../shared/directives/block-badge-directive';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { getRoleTranslationAr } from '../../../../core/constants/dictionaries/roles.dictionary';
import { RoleService } from '../../services/role.service';
import { UserService } from '../../services/user.service';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { CardComponent } from '../../../../shared/components/card/card';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

import { UserStatisticsDto } from '../../models/User/responses/UserStatisticsDto';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ReportService } from '../../services/report.service';

import { Permissions } from '../../../../core/constants/Permissions';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { CacheService } from '../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';
import { TableSkeletonComponent } from '../../../../shared/components/skeletons/table-skeleton/table-skeleton.component';


const UI_STATE_CACHE_KEY = 'UserList_UI_State';

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

    HeaderComponent,
    HasPermissionDirective,
    PaginationComponent,
    TableSkeletonComponent
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
  private readonly cacheService = inject(CacheService);
  private readonly destroyRef = inject(DestroyRef);

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
    isBlocked: undefined,
  });

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.searchTerm || f.verificationStatus || f.roleId || f.isBlocked !== undefined);
  });

  resetFilters(): void {
    this.cacheService.remove(UI_STATE_CACHE_KEY);
    this.filter.set({
      pageNumber: 1,
      pageSize: 10,
      searchTerm: '',
      verificationStatus: '' as any,
      roleId: '' as any,
      isBlocked: undefined,
    });
    this.loadUsers();
  }

  private searchSubject = new Subject<string>();
  private readonly fetchTrigger$ = new Subject<void>();
  VerificationStatusEnum = VerificationStatus;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cacheService.set(
        UI_STATE_CACHE_KEY,
        { filter: this.filter() },
        CACHE_TTL.UI_STATE,
        [CACHE_TAGS.UI_STATE]
      );
    });
  }

  ngOnInit() {
    const cachedState = this.cacheService.get<{ filter: UserFilterDto }>(UI_STATE_CACHE_KEY);
    if (cachedState) {
      this.filter.set(cachedState.filter);
    }

    this.loadRoles();
    this.setupFetchPipeline();
    this.loadStatistics();
    
    // Initial fetch
    this.loadUsers();

    this.searchSubject
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term: string) => {
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
      error: (err) => {
        this.toast.error(extractErrorMessage(err, 'تعذر تحميل الأدوار'));
      }
    });
  }

  loadUsers() {
    this.fetchTrigger$.next();
  }

  private setupFetchPipeline() {
    this.fetchTrigger$
      .pipe(
        tap(() => this.isLoading.set(true)),
        switchMap(() =>
          this.userService.getAllUsers(this.filter()).pipe(
            catchError((err) => {
              this.isLoading.set(false);
              this.toast.error(extractErrorMessage(err, 'تعذر تحميل قائمة المستخدمين'));
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        if (res && res.success && res.data) {
          this.users.set(res.data.items);
          this.totalCount.set(res.data.totalCount);
          this.totalPages.set(res.data.totalPages);
        }
        this.isLoading.set(false);
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
      error: (err) => {
        this.toast.error(extractErrorMessage(err, 'تعذر الاتصال بالخادم لتحميل الإحصائيات'));
        this.loadingStats.set(false);
      }
    });
  }

  navigateToRegister() {
    this.router.navigate(['/admin/users/registerByAdmin']);
  }

  downloadReport(): void {
    const reportFilter = {
      pageNumber: this.filter().pageNumber,
      pageSize: this.filter().pageSize,
      searchTerm: this.filter().searchTerm || undefined,
      verificationStatus: this.filter().verificationStatus || undefined,
      roleId: this.filter().roleId || undefined,
      isBlocked: this.filter().isBlocked ?? null
    };

    this.reportService
      .generateUsersPdfReport(reportFilter)
      .subscribe({
        next: (response) => {
          this.reportService.download(response);
        },
        error: (err) => {
          this.toast.error(extractErrorMessage(err, 'تعذر الاتصال بالخادم لتنزيل تقرير المستخدمين'));
        }
      });
  }
}
