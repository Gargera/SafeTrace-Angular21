import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, tap, catchError, EMPTY } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CaseListItemResponse, CasesFilterRequest } from '../../../../core/models/cases.model';
import { CaseType } from '../../../../shared/enums/case-type';
import { CaseStatus } from '../../../../shared/enums/case-status';
import { CardComponent } from '../../../../shared/components/card/card';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ReportService } from '../../services/report.service';

// Badge directives
import { CaseTypeBadgeDirective } from '../../../../shared/directives/case-type-badge-directive';
import { CaseStatusBadgeDirective } from '../../../../shared/directives/case-status-badge-directive';

import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { DashboardService } from '../../services/dashboard.service';
import { CasesStatisticsDto as DashboardStatistics } from '../../models/Dashboard/responses/CasesStatisticsDto';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { CasesManagementService } from '../../services/cases-management.service';
import { Permissions } from '../../../../core/constants/Permissions';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { AuthService } from '../../../../core/services/auth.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { CacheService } from '../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';
import { CasesFilterState } from '../../../../shared/helper/cases-filter-state';
import { TableSkeletonComponent } from '../../../../shared/components/skeletons/table-skeleton/table-skeleton.component';

const UI_STATE_CACHE_KEY = 'Dashboard_UI_State';

@Component({
  selector: 'app-cases-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardComponent,

    EmptyStateComponent,
    ButtonComponent,
    ConfirmationModalComponent,
    CaseTypeBadgeDirective,
    CaseStatusBadgeDirective,
    HeaderComponent,
    CaseFiltersComponent,
    HasPermissionDirective,
    PaginationComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './cases-management.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CasesManagement implements OnInit, OnDestroy {
  protected readonly CaseType = CaseType;
  protected readonly CaseStatus = CaseStatus;

  Permissions = Permissions;
  caseActionPermissions = [
    Permissions.LongTermCases.GetById,
    Permissions.LongTermCases.HardDelete,
    Permissions.UnknownCases.GetById,
    Permissions.UnknownCases.HardDelete,
    Permissions.UrgentCases.GetById,
    Permissions.UrgentCases.HardDelete,
  ];

  public authService = inject(AuthService);

  private readonly casesService = inject(CasesManagementService);
  private readonly dashboardService = inject(DashboardService);
  private readonly toast = inject(SnackbarService);
  private readonly reportService = inject(ReportService);
  private readonly cacheService = inject(CacheService);
  private readonly destroyRef = inject(DestroyRef);

  // Statistics
  statistics = signal<DashboardStatistics | null>(null);
  loadingStats = signal(true);

  // State & Data
  readonly filterState = new CasesFilterState<CasesFilterRequest>(12);
  readonly currentPage = this.filterState.currentPage;
  readonly totalPages = this.filterState.totalPages;
  readonly totalCount = this.filterState.totalItems;
  readonly pageSize = this.filterState.pageSize;
  readonly baseFilter = this.filterState.filter;
  
  cases = signal<CaseListItemResponse[]>([]);
  loading = this.filterState.loading;

  private readonly fetchTrigger$ = new Subject<void>();

  // Modal
  showConfirmModal = signal(false);
  modalConfig = signal<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    action: 'delete';
    caseId?: number;
    caseType?: CaseType;
  } | null>(null);

  // Computed
  hasResults = computed(() => this.cases().length > 0);
  hasNextPage = computed(() => this.currentPage() < this.totalPages());
  hasAnyCases = computed(() => this.totalCount() > 0);
  hasActiveFilters = computed(() => {
    const f = this.baseFilter();
    return !!(
      f.fullName ||
      f.government ||
      f.city ||
      f.caseCode ||
      f.gender ||
      f.ageCategory ||
      f.minAge ||
      f.maxAge ||
      f.fromDate ||
      f.toDate ||
      f.status ||
      f.caseType ||
      f.ageSort ||
      f.dateSort
    );
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cacheService.set(
        UI_STATE_CACHE_KEY,
        {
          filter: this.baseFilter(),
          page: this.currentPage()
        },
        CACHE_TTL.UI_STATE,
        [CACHE_TAGS.UI_STATE]
      );
    });
  }

  ngOnInit(): void {
    const cachedState = this.cacheService.get<{ filter: CasesFilterRequest, page: number }>(UI_STATE_CACHE_KEY);
    if (cachedState) {
      this.filterState.restoreState(cachedState.filter);
      if (cachedState.page) {
        this.filterState.onPageChange(cachedState.page);
      }
    }

    this.setupFetchPipeline();
    this.loadStatistics();
    this.loadCases();
  }

  ngOnDestroy(): void {}

  // ---------- Event handlers ----------
  onFilterChange(filter: CasesFilterRequest): void {
    this.filterState.onFilterChange(filter, () => this.loadCases());
  }

  resetFilters(): void {
    this.cacheService.remove(UI_STATE_CACHE_KEY);
    this.filterState.onFilterReset(() => this.loadCases());
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.filterState.onPageChange(page, () => this.loadCases());
  }

  getFullName(item: CaseListItemResponse): string {
    const parts = [item.fName, item.sName, item.tName, item.lName].filter(Boolean);
    return parts.length ? parts.join(' ') : 'غير معروف';
  }

  getLocation(item: CaseListItemResponse): string {
    return [item.city, item.government].filter(Boolean).join(' ، ') || 'غير محدد';
  }

  goToPage(page: number): void {
    this.changePage(page);
  }

  // ---------- Statistics ----------
  private loadStatistics(): void {
    this.loadingStats.set(true);
    this.dashboardService.getCasesStatistics().subscribe({
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
      },
    });
  }

  // ---------- Cases loading ----------
  private loadCases(): void {
    this.fetchTrigger$.next();
  }

  private setupFetchPipeline(): void {
    this.fetchTrigger$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.filterState.hasError.set(false);
        }),
        switchMap(() =>
          this.casesService.getCases(this.baseFilter(), this.currentPage(), this.pageSize()).pipe(
            catchError((err) => {
              this.loading.set(false);
              this.filterState.hasError.set(true);
              this.toast.error(extractErrorMessage(err, 'تعذر الاتصال بالخادم'));
              this.cases.set([]);
              this.totalCount.set(0);
              this.filterState.totalPages.set(0);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          if (!result) return;
          this.cases.set(result.items);
          this.totalCount.set(result.totalCount);
          this.filterState.totalPages.set(result.totalPages);
          this.loading.set(false);
        }
      });
  }

  // ---------- Delete ----------
  requestDelete(caseId: number): void {
    const caseItem = this.cases().find((c) => c.id === caseId);
    if (!caseItem) {
      this.toast.error('الحالة غير موجودة');
      return;
    }

    this.modalConfig.set({
      title: 'حذف الحالة',
      message: 'هل أنت متأكد من حذف هذه الحالة؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      action: 'delete',
      caseId,
      caseType: caseItem.caseType,
    });
    this.showConfirmModal.set(true);
  }

  isDeleting = signal(false);
  isDownloading = signal(false);

  confirmAction(): void {
    const config = this.modalConfig();
    if (!config || !config.caseId || !config.caseType || this.isDeleting()) return;
    this.isDeleting.set(true);

    this.casesService.deleteCase(config.caseId, config.caseType).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.cases.update((items) => items.filter((item) => item.id !== config.caseId));
        this.totalCount.update((c) => Math.max(0, c - 1));
        if (this.totalCount() === 0) this.filterState.totalPages.set(0);
        this.toast.success('تم حذف الحالة بنجاح');
        this.closeModal();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toast.error(extractErrorMessage(err, 'فشل حذف الحالة'));
        this.modalConfig.set(null);
      },
    });
  }

  closeModal(): void {
    this.showConfirmModal.set(false);
    this.modalConfig.set(null);
  }

  getDetailsRoute(caseItem: CaseListItemResponse) {
    switch (caseItem.caseType) {
      case CaseType.LongTerm:
        return ['/admin/long-term', caseItem.id];

      case CaseType.Unknown:
        return ['/admin/unknown', caseItem.id];

      case CaseType.Urgent:
        return ['/admin/urgent', caseItem.id];

      default:
        return ['/admin/cases-management'];
    }
  }

  getDeletePermission(caseType: CaseType): string {
    switch (caseType) {
      case CaseType.LongTerm: return Permissions.LongTermCases.HardDelete;
      case CaseType.Unknown: return Permissions.UnknownCases.HardDelete;
      case CaseType.Urgent: return Permissions.UrgentCases.HardDelete;
      default: return '';
    }
  }

  getViewPermission(caseType: CaseType): string {
    switch (caseType) {
      case CaseType.LongTerm: return Permissions.LongTermCases.GetById;
      case CaseType.Unknown: return Permissions.UnknownCases.GetById;
      case CaseType.Urgent: return Permissions.UrgentCases.GetById;
      default: return '';
    }
  }

  downloadReport(): void {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);
    this.reportService
      .generateCasesPdfReport(this.baseFilter())
      .subscribe({
        next: (response) => {
          this.isDownloading.set(false);
          this.reportService.download(response);
        },
        error: (err) => {
          this.isDownloading.set(false);
          this.toast.error(extractErrorMessage(err, 'تعذر الاتصال بالخادم لتنزيل تقرير الحالات'));
        }
      });
  }

}
