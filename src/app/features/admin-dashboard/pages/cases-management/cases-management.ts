import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CaseListItemResponse, CasesFilterRequest } from '../../../../core/models/cases.model';
import { CaseType } from '../../../../shared/enums/case-type';
import { CaseStatus } from '../../../../shared/enums/case-status';
import { CardComponent } from '../../../../shared/components/card/card';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { SnackbarService } from '../../../../core/services/toast.service';
import { ReportService } from '../../services/report.service';

// Badge directives
import { CaseTypeBadgeDirective } from '../../../../shared/directives/case-type-badge-directive';
import { CaseStatusBadgeDirective } from '../../../../shared/directives/case-status-badge-directive';

import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { DashboardService } from '../../services/dashboard.service';
import { CasesStatisticsDto as DashboardStatistics } from '../../models/Dashboard/CasesStatisticsDto';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { CasesManagementService } from '../../services/cases-management.service';
import { Permissions } from '../../../../core/constants/Permissions';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { AuthService } from '../../../../core/services/auth.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';

const FILTER_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-cases-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ButtonComponent,
    ConfirmationModalComponent,
    CaseTypeBadgeDirective,
    CaseStatusBadgeDirective,
    CaseHeaderComponent,
    CaseFiltersComponent,
    HasPermissionDirective,
    PaginationComponent,
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

  // Statistics
  statistics = signal<DashboardStatistics | null>(null);
  loadingStats = signal(true);

  // Data & pagination
  currentPage = signal(1);
  totalPages = signal(0);
  totalCount = signal(0);
  readonly pageSize = 12;

  cases = signal<CaseListItemResponse[]>([]);
  loading = signal(true);

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

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  // Computed
  hasResults = computed(() => this.cases().length > 0);
  hasNextPage = computed(() => this.currentPage() < this.totalPages());
  hasAnyCases = computed(() => this.totalCount() > 0);

  // -------- UNIFIED FILTER --------
  public baseFilter = signal<CasesFilterRequest>(this.getDefaultFilter());

  private getDefaultFilter(): CasesFilterRequest {
    return {
      status: null,
      gender: null,
      ageCategory: null,
      fullName: null,
      government: null,
      city: null,
      minAge: null,
      maxAge: null,
      fromDate: null,
      toDate: null,
      ageSort: null,
      dateSort: null,
      caseType: null,
      caseCode: null,
      page: 1,
      pageSize: this.pageSize,
    };
  }

  constructor() {
    effect(() => {
      this.baseFilter();

      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      this.searchDebounceTimer = setTimeout(() => {
        this.currentPage.set(1);
        this.loadCases();
      }, FILTER_DEBOUNCE_MS);
    });
  }

  ngOnInit(): void {
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  // ---------- Event handlers ----------
  onFilterChange(filter: CasesFilterRequest): void {
    this.baseFilter.set(filter);
  }

  resetFilters(): void {
    this.baseFilter.set(this.getDefaultFilter());
    this.currentPage.set(1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.loadCases();
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
        this.toast.error(err.error?.detail || 'تعذر الاتصال بالخادم لتحميل الإحصائيات');
        this.loadingStats.set(false);
      },
    });
  }

  // ---------- Cases loading ----------
  private loadCases(): void {
    this.loading.set(true);

    this.casesService.getCases(this.baseFilter(), this.currentPage(), this.pageSize).subscribe({
      next: (result) => {
        this.cases.set(result.items);
        this.totalCount.set(result.totalCount);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'تعذر الاتصال بالخادم');
        this.cases.set([]);
        this.totalCount.set(0);
        this.totalPages.set(0);
        this.loading.set(false);
      },
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

  confirmAction(): void {
    const config = this.modalConfig();
    if (!config || !config.caseId || !config.caseType) return;
    this.showConfirmModal.set(false);

    this.casesService.deleteCase(config.caseId, config.caseType).subscribe({
      next: () => {
        this.cases.update((items) => items.filter((item) => item.id !== config.caseId));
        this.totalCount.update((c) => Math.max(0, c - 1));
        if (this.totalCount() === 0) this.totalPages.set(0);
        this.toast.success('تم حذف الحالة بنجاح');
        this.modalConfig.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'فشل حذف الحالة');
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

  this.reportService
    .generateCasesPdfReport(this.baseFilter())
    .subscribe(response => {
      this.reportService.download(response);
    });
}

}
