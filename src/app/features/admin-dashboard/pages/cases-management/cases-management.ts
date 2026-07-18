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
import { CasesFilterRequest } from '../../../../core/models/Cases.model';
import { CaseType } from '../../../../shared/enums/case-type';
import { CaseStatus } from '../../../../shared/enums/case-status';
import { CardComponent } from '../../../../shared/components/card/card';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { SnackbarService } from '../../../../core/services/toast.service';

// Badge directives for the table
import { CaseTypeBadgeDirective } from '../../../../shared/directives/case-type-badge-directive';
import { CaseStatusBadgeDirective } from '../../../../shared/directives/case-status-badge-directive';

// Services
import { UrgentCaseService } from '../../../urgent-cases/services/urgent-case.service';
import { LongTermCaseService } from '../../../long-term-cases/services/long-term-case.service';
import { UnknownCaseService } from '../../../unknown-cases/services/unknown-case.service';

// Models for mapping
import { UrgentCaseListItemResponse } from '../../../urgent-cases/models/response/UrgentCaseListItemResponse';
import { LongTermCaseListItemResponse } from '../../../long-term-cases/models/response/LongTermCaseListItemResponse';
import { UnknownCaseListItemResponse } from '../../../unknown-cases/models/response/UnknownCaseListItemResponse';
import { getAgeCategory } from '../../../../shared/helper/age-category.helper';
import { MyCaseListItemResponse } from '../../../user-profile/model/profile.model';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';

// Statistics interface
interface DashboardStatistics {
  total: number;
  urgent: number;
  longTerm: number;
  unknown: number;
  active: number;
  found: number;
}

const FILTER_DEBOUNCE_MS = 400;

// Type union for service response items
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
    FormField,
    ButtonComponent,
    ConfirmationModalComponent,
    CaseTypeBadgeDirective,
    CaseStatusBadgeDirective,
    CaseHeaderComponent,
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
  private toast = inject(SnackbarService);

  // Statistics
  statistics = signal<DashboardStatistics | null>(null);
  loadingStats = signal(true);

  // Filters
  caseTypeFilter = signal<CaseType | ''>('');
  currentPage = signal(1);
  totalPages = signal(0);
  totalCount = signal(0);
  readonly pageSize = 12;

  // Data
  cases = signal<MyCaseListItemResponse[]>([]);
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

  // -------- PUBLIC FILTER (never null) --------
  public baseFilter = signal<CasesFilterRequest>(this.getDefaultFilter());

  // Pagination array (matches user-list)
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

  // Helper to create a complete default filter
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
      page: 1,
      pageSize: this.pageSize,
    };
  }

  constructor() {
    // Effect to reload when caseType or baseFilter changes (with debounce)
    effect(() => {
      this.baseFilter(); // trigger on change
      this.caseTypeFilter();

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

  // Called when CaseFiltersComponent emits a change
  onFilterChange(filter: CasesFilterRequest): void {
    this.baseFilter.set(filter);
  }

  // Called when caseType dropdown changes
  onCaseTypeChange(type: CaseType | ''): void {
    this.caseTypeFilter.set(type);
  }

  // Search handler – uses fullName (no undefined)
  onSearchChange(value: string): void {
    const currentFilter = this.baseFilter();
    this.baseFilter.set({ ...currentFilter, fullName: value || null });
  }

  // Status change handler – uses null not undefined
  onStatusChange(value: CaseStatus | ''): void {
    const currentFilter = this.baseFilter();
    this.baseFilter.set({ ...currentFilter, status: value || null });
  }

  // Reset all filters
  resetFilters(): void {
    this.baseFilter.set(this.getDefaultFilter());
    this.caseTypeFilter.set('');
    this.currentPage.set(1);
    // effect triggers reload
  }

  // Change page (used in pagination)
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.loadCases();
  }

  // Helper to get location string for table
  getLocation(item: MyCaseListItemResponse): string {
    return [item.city, item.government].filter(Boolean).join(' ، ') || 'غير محدد';
  }

  // -------------------- Statistics --------------------
  private loadStatistics(): void {
    this.loadingStats.set(true);

    const fetchCounts = (
      service: UrgentCaseService | LongTermCaseService | UnknownCaseService,
      status: CaseStatus | null,
    ): Promise<number> => {
      return new Promise((resolve) => {
        // Build a full filter with all required fields
        const filter = this.getDefaultFilter();
        filter.status = status;
        filter.page = 1;
        filter.pageSize = 1;
        service.getAllCases(filter as any).subscribe({
          next: (res) => resolve(res.data?.totalCount ?? 0),
          error: () => resolve(0),
        });
      });
    };

    const types = [
      { service: this.urgentService, type: 'urgent' },
      { service: this.longTermService, type: 'longTerm' },
      { service: this.unknownService, type: 'unknown' },
    ];

    const requests = types.map(({ service, type }) => {
      return Promise.all([
        fetchCounts(service, null),
        fetchCounts(service, CaseStatus.Active),
        fetchCounts(service, CaseStatus.Found),
      ]).then(([total, active, found]) => ({ type, total, active, found }));
    });

    Promise.all(requests).then((results) => {
      const stats: DashboardStatistics = {
        total: 0,
        urgent: 0,
        longTerm: 0,
        unknown: 0,
        active: 0,
        found: 0,
      };

      results.forEach((r) => {
        if (r.type === 'urgent') stats.urgent = r.total;
        else if (r.type === 'longTerm') stats.longTerm = r.total;
        else if (r.type === 'unknown') stats.unknown = r.total;
        stats.total += r.total;
        stats.active += r.active;
        stats.found += r.found;
      });

      this.statistics.set(stats);
      this.loadingStats.set(false);
    });
  }

  // -------------------- Cases loading --------------------
  private loadCases(): void {
    const base = this.baseFilter();
    this.loading.set(true);
    const typeFilter = this.caseTypeFilter();

    if (typeFilter) {
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

    service.getAllCases(filter).subscribe({
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
          const mappedItems =
            pagination.items?.map((item: CaseListItemUnion) => this.mapToMyCaseItem(item, type)) ??
            [];
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
      this.urgentService.getAllCases({
        ...baseFilter,
        page: 1,
        pageSize,
        latitude: null,
        longitude: null,
        radiusInMeters: null,
      }),
      this.longTermService.getAllCases({ ...baseFilter, page: 1, pageSize }),
      this.unknownService.getAllCases({ ...baseFilter, page: 1, pageSize }),
    ];

    Promise.all(fetchPromises.map((p) => p.toPromise()))
      .then((responses) => {
        let allItems: MyCaseListItemResponse[] = [];
        let totalCount = 0;

        responses.forEach((res, index) => {
          if (res?.success && res.data) {
            const type = [CaseType.Urgent, CaseType.LongTerm, CaseType.Unknown][index];
            const items =
              res.data.items?.map((item: CaseListItemUnion) => this.mapToMyCaseItem(item, type)) ??
              [];
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

  // -------------------- Mapping helper --------------------
  private mapToMyCaseItem(item: CaseListItemUnion, caseType: CaseType): MyCaseListItemResponse {
    const fullName =
      item.fName || item.sName || item.tName || item.lName
        ? [item.fName, item.sName, item.tName, item.lName].filter(Boolean).join(' ')
        : 'غير معروف';

    const ageCategory = item.age != null ? getAgeCategory(item.age) : null;
    const mainImageUrl = (item as any).mainPhoto || (item as any).mainImageUrl || '';

    return {
      id: item.id,
      caseCode: item.caseCode,
      caseType: caseType,
      status: item.status,
      fullName: fullName,
      gender: item.gender,
      age: item.age,
      ageCategory: ageCategory,
      city: item.city,
      government: item.government,
      createdAt: item.createdAt,
      mainImageUrl: mainImageUrl,
      sName: null,
      tName: null,
      lName: null,
      communicationPhone: null,
      description: null,
    } as MyCaseListItemResponse;
  }

  // -------------------- Load More (append) --------------------
  loadMore(): void {
    if (!this.hasNextPage() || this.loadingMore()) return;

    this.loadingMore.set(true);
    const nextPage = this.currentPage() + 1;
    const typeFilter = this.caseTypeFilter();
    const base = this.baseFilter();

    if (typeFilter) {
      const service = this.getService(typeFilter);
      const filter: any = { ...base, page: nextPage, pageSize: this.pageSize };
      service.getAllCases(filter).subscribe({
        next: (res) => {
          if (!res.success) {
            this.toast.error(res.message || 'فشل تحميل المزيد');
            this.loadingMore.set(false);
            return;
          }
          const pagination = res.data;
          if (pagination) {
            const newItems =
              pagination.items?.map((item: CaseListItemUnion) =>
                this.mapToMyCaseItem(item, typeFilter),
              ) ?? [];
            this.cases.update((items) => [...items, ...newItems]);
            this.currentPage.set(pagination.pageNumber);
            this.totalPages.set(pagination.totalPages);
            this.totalCount.set(pagination.totalCount ?? 0);
          }
          this.loadingMore.set(false);
        },
        error: () => {
          this.toast.error('تعذر الاتصال بالخادم');
          this.loadingMore.set(false);
        },
      });
    } else {
      this.toast.info('تحميل المزيد غير متاح عند عرض جميع الأنواع');
      this.loadingMore.set(false);
    }
  }

  // -------------------- Delete --------------------
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

  goToPage(page: number): void {
    this.changePage(page);
  }
}
