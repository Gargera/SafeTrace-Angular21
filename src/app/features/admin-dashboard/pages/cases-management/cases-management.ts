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
import { CaseListItemResponse, CasesFilterRequest } from '../../../../core/models/Cases.model';
import { CaseType } from '../../../../shared/enums/case-type';
import { CaseStatus } from '../../../../shared/enums/case-status';
import { CardComponent } from '../../../../shared/components/card/card';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { SnackbarService } from '../../../../core/services/toast.service';

// Badge directives
import { CaseTypeBadgeDirective } from '../../../../shared/directives/case-type-badge-directive';
import { CaseStatusBadgeDirective } from '../../../../shared/directives/case-status-badge-directive';

// Services
import { UrgentCaseService } from '../../../urgent-cases/services/urgent-case.service';
import { LongTermCaseService } from '../../../long-term-cases/services/long-term-case.service';
import { UnknownCaseService } from '../../../unknown-cases/services/unknown-case.service';

// Models – list items only (used for documentation)
import { UrgentCaseListItemResponse } from '../../../urgent-cases/models/response/UrgentCaseListItemResponse';
import { LongTermCaseListItemResponse } from '../../../long-term-cases/models/response/LongTermCaseListItemResponse';
import { UnknownCaseListItemResponse } from '../../../unknown-cases/models/response/UnknownCaseListItemResponse';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { DashboardService } from '../../services/dashboard.service';
import { CasesStatisticsDto as DashboardStatistics } from '../../models/Dashboard/CasesStatisticsDto';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';

const FILTER_DEBOUNCE_MS = 400;

// Union type – used only for documentation; the actual items are cast to any
type CaseListItemUnion =
  UrgentCaseListItemResponse | LongTermCaseListItemResponse | UnknownCaseListItemResponse;

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
  ],
  templateUrl: './cases-management.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CasesManagement implements OnInit, OnDestroy {
  protected readonly CaseType = CaseType;
  protected readonly CaseStatus = CaseStatus;

  private urgentService = inject(UrgentCaseService);
  private longTermService = inject(LongTermCaseService);
  private unknownService = inject(UnknownCaseService);
  private dashboardService = inject(DashboardService);
  private toast = inject(SnackbarService);

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
  loadingMore = signal(false);

  // Modal
  showConfirmModal = signal(false);
  modalConfig = signal<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    action: 'delete';
    caseId?: number;
  } | null>(null);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  // Computed
  hasResults = computed(() => this.cases().length > 0);
  hasNextPage = computed(() => this.currentPage() < this.totalPages());
  hasAnyCases = computed(() => this.totalCount() > 0);

  // -------- UNIFIED FILTER --------
  public baseFilter = signal<CasesFilterRequest>(this.getDefaultFilter());

  // Pagination array
  pagesArray = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

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
      error: () => {
        this.toast.error('تعذر الاتصال بالخادم لتحميل الإحصائيات');
        this.loadingStats.set(false);
      },
    });
  }

  // ---------- Cases loading ----------
  private loadCases(): void {
    const base = this.baseFilter();
    this.loading.set(true);
    const typeFilter = base.caseType;

    if (typeFilter !== null && typeFilter !== undefined) {
      this.loadCasesByType(typeFilter, base);
    } else {
      this.loadAllCasesCombined(base);
    }
  }

  private loadCasesByType(type: CaseType, baseFilter: CasesFilterRequest): void {
    const service = this.getService(type);
    const filter: any = {
      ...baseFilter,
      page: this.currentPage(),
      pageSize: this.pageSize,
    };

    service.adminGetAllCases(filter).subscribe({
      next: (res) => {
        if (!res.success) {
          this.toast.error(res.message || 'فشل تحميل الحالات');
          this.cases.set([]);
          this.totalPages.set(0);
          this.totalCount.set(0);
          this.loading.set(false);
          return;
        }

        const pagination = res.data;
        if (pagination) {
          // ✅ Cast item to any to handle mismatched DTOs (e.g., detail vs list)
          const mappedItems =
            pagination.items?.map((item: any) => this.mapToCaseListItem(item, type)) ?? [];
          this.cases.set(mappedItems);
          this.totalPages.set(pagination.totalPages);
          this.totalCount.set(pagination.totalCount ?? 0);
        } else {
          this.cases.set([]);
          this.totalPages.set(0);
          this.totalCount.set(0);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('تعذر الاتصال بالخادم');
        this.cases.set([]);
        this.totalPages.set(0);
        this.totalCount.set(0);
        this.loading.set(false);
      },
    });
  }

  private loadAllCasesCombined(baseFilter: CasesFilterRequest): void {
    const pageSize = this.pageSize * 3;
    const fetchPromises = [
      this.urgentService.adminGetAllCases({
        ...baseFilter,
        page: 1,
        pageSize,
        latitude: null,
        longitude: null,
        radiusInMeters: null,
      }),
      this.longTermService.adminGetAllCases({ ...baseFilter, page: 1, pageSize }),
      this.unknownService.adminGetAllCases({ ...baseFilter, page: 1, pageSize }),
    ];

    Promise.all(fetchPromises.map((p) => p.toPromise()))
      .then((responses) => {
        let allItems: CaseListItemResponse[] = [];
        let totalCount = 0;

        responses.forEach((res, index) => {
          if (res?.success && res.data) {
            const type = [CaseType.Urgent, CaseType.LongTerm, CaseType.Unknown][index];
            // ✅ Cast item to any
            const items =
              res.data.items?.map((item: any) => this.mapToCaseListItem(item, type)) ?? [];
            allItems = allItems.concat(items);
            totalCount += res.data.totalCount ?? 0;
          }
        });

        allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const start = (this.currentPage() - 1) * this.pageSize;
        const end = start + this.pageSize;
        const paginatedItems = allItems.slice(start, end);

        this.cases.set(paginatedItems);
        this.totalCount.set(totalCount);
        this.totalPages.set(Math.ceil(totalCount / this.pageSize));
        this.loading.set(false);
      })
      .catch(() => {
        this.toast.error('فشل تحميل الحالات');
        this.cases.set([]);
        this.totalPages.set(0);
        this.totalCount.set(0);
        this.loading.set(false);
      });
  }

  private getService(type: CaseType): UrgentCaseService | LongTermCaseService | UnknownCaseService {
    switch (type) {
      case CaseType.Urgent:
        return this.urgentService;
      case CaseType.LongTerm:
        return this.longTermService;
      case CaseType.Unknown:
        return this.unknownService;
      default:
        throw new Error('Invalid case type');
    }
  }

  // ---------- Mapping to standard CaseListItemResponse ----------
  private mapToCaseListItem(item: any, caseType: CaseType): CaseListItemResponse {
    return {
      id: item.id,
      caseCode: item.caseCode,
      caseType: caseType,
      status: item.status,
      fName: item.fName ?? null,
      sName: item.sName ?? null,
      tName: item.tName ?? null,
      lName: item.lName ?? null,
      gender: item.gender,
      age: item.age,
      city: item.city,
      government: item.government,
      createdAt: item.createdAt,
      mainPhoto: item.mainPhoto || item.mainImageUrl || '',
    };
  }

  // ---------- Delete ----------
  requestDelete(caseId: number): void {
    this.modalConfig.set({
      title: 'حذف الحالة',
      message: 'هل أنت متأكد من حذف هذه الحالة؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      action: 'delete',
      caseId,
    });
    this.showConfirmModal.set(true);
  }

  confirmAction(): void {
    const config = this.modalConfig();
    if (!config || !config.caseId) return;
    this.showConfirmModal.set(false);

    const caseItem = this.cases().find((c) => c.id === config.caseId);
    if (!caseItem) {
      this.toast.error('الحالة غير موجودة');
      this.modalConfig.set(null);
      return;
    }

    const service = this.getService(caseItem.caseType);
    service.deleteCase(config.caseId).subscribe({
      next: () => {
        this.cases.update((items) => items.filter((item) => item.id !== config.caseId));
        this.totalCount.update((c) => Math.max(0, c - 1));
        if (this.totalCount() === 0) this.totalPages.set(0);
        this.toast.success('تم حذف الحالة بنجاح');
        this.modalConfig.set(null);
      },
      error: () => {
        this.toast.error('فشل حذف الحالة');
        this.modalConfig.set(null);
      },
    });
  }

  closeModal(): void {
    this.showConfirmModal.set(false);
    this.modalConfig.set(null);
  }
}
