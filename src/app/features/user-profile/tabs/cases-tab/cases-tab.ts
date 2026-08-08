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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ProfileService } from '../../service/profile.service';
import { UrgentCaseService } from '../../../urgent-cases/services/urgent-case.service';
import { LongTermCaseService } from '../../../long-term-cases/services/long-term-case.service';
import { UnknownCaseService } from '../../../unknown-cases/services/unknown-case.service';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { CacheService } from '../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';

import { MyCaseListItemResponse, MyCasesFilterRequest } from '../../model/profile.model';
import { CaseType } from '../../../../shared/enums/case-type';
import { CaseStatus } from '../../../../shared/enums/case-status';
import { FoundPersonInfoRequest, CasesFilterRequest } from '../../../../core/models/cases.model';

import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { CaseCardCompactComponent } from '../../../../shared/components/cases-components/case-card-compact/case-card-compact.component';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { FoundedPopupComponent } from '../../../../shared/components/cases-components/founded-popup/founded-popup';

const CASE_TYPE_ORDER: CaseType[] = [CaseType.Urgent, CaseType.LongTerm, CaseType.Unknown];
const UI_STATE_CACHE_KEY = 'MyCasesTab_UI_State';

@Component({
  selector: 'app-my-cases-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingSpinnerComponent,
    CaseCardCompactComponent,
    EmptyStateComponent,
    ButtonComponent,
    ConfirmationModalComponent,
    HeaderComponent,
    CaseFiltersComponent,
    FoundedPopupComponent,
  ],
  templateUrl: './cases-tab.html',
  styleUrls: ['./cases-tab.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class MyCasesTab implements OnInit, OnDestroy {
  protected readonly CaseType = CaseType;
  protected readonly CaseStatus = CaseStatus;

  private profileService = inject(ProfileService);
  private urgentService = inject(UrgentCaseService);
  private longTermService = inject(LongTermCaseService);
  private unknownService = inject(UnknownCaseService);
  private toast = inject(SnackbarService);
  private cacheService = inject(CacheService);
  private destroyRef = inject(DestroyRef);

  // Filters
  filterRequest = signal<MyCasesFilterRequest>({});
  currentPage = signal(1);
  totalPages = signal(0);
  totalCount = signal(0); // total number of cases matching current filters
  overallTotalCount = signal(0); // total number of cases in the system (without any filter)
  readonly pageSize = 10;

  // Data – this is the filtered result from the backend
  allCases = signal<MyCaseListItemResponse[]>([]);
  initialLoad = signal(true);
  loading = signal(true);
  loadingMore = signal(false);

  // Modal states
  showConfirmModal = signal(false);
  modalConfig = signal<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    action: 'delete' | 'markAsFound';
    caseId?: number;
    caseType?: CaseType;
    variant?: 'primary' | 'danger';
    icon?: string;
  } | null>(null);

  showMarkAsFoundModal = signal(false);
  markAsFoundCaseId = signal<number | null>(null);
  markAsFoundCaseType = signal<CaseType | null>(null);

  private isFirstFilterRun = true;

  // Computed
  // No local filtering – all filtering is done by the backend.
  filteredCases = computed(() => this.allCases());

  // Whether there are any cases at all (from overall total)
  hasAnyCases = computed(() => this.overallTotalCount() > 0);

  // Whether the current filtered list has results
  hasResults = computed(() => this.allCases().length > 0);

  // Total count for header badge (filtered results)
  totalCases = computed(() => this.totalCount());

  hasNextPage = computed(() => this.currentPage() < this.totalPages());

  groupedCases = computed(() => {
    const cases = this.filteredCases();

    const map = new Map<CaseType, MyCaseListItemResponse[]>();

    for (const item of cases) {
      if (!map.has(item.caseType)) {
        map.set(item.caseType, []);
      }

      map.get(item.caseType)!.push(item);
    }

    const labels: Record<CaseType, string> = {
      [CaseType.Urgent]: 'حالات عاجلة',
      [CaseType.LongTerm]: 'حالات مفقودين طويل الأمد',
      [CaseType.Unknown]: 'حالات مجهولة الهوية',
    };

    return CASE_TYPE_ORDER.filter((type) => map.has(type)).map((type) => ({
      type,
      label: labels[type],
      cases: map.get(type)!,
    }));
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cacheService.set(
        UI_STATE_CACHE_KEY,
        {
          filterRequest: this.filterRequest(),
          currentPage: this.currentPage(),
          modalConfig: this.showConfirmModal() ? this.modalConfig() : null,
          showMarkAsFoundModal: this.showMarkAsFoundModal(),
          markAsFoundCaseId: this.markAsFoundCaseId(),
          markAsFoundCaseType: this.markAsFoundCaseType()
        },
        CACHE_TTL.UI_STATE,
        [CACHE_TAGS.UI_STATE]
      );
    });
  }

  ngOnInit(): void {
    const cachedState = this.cacheService.get<any>(UI_STATE_CACHE_KEY);
    if (cachedState) {
      if (cachedState.filterRequest) this.filterRequest.set(cachedState.filterRequest);
      if (cachedState.currentPage) this.currentPage.set(cachedState.currentPage);
      
      if (cachedState.modalConfig) {
        this.modalConfig.set(cachedState.modalConfig);
        this.showConfirmModal.set(true);
      }
      if (cachedState.showMarkAsFoundModal) {
        this.markAsFoundCaseId.set(cachedState.markAsFoundCaseId);
        this.markAsFoundCaseType.set(cachedState.markAsFoundCaseType);
        this.showMarkAsFoundModal.set(true);
      }
    }

    this.loadCases();
  }

  ngOnDestroy(): void { }

  onFilterChange(request: CasesFilterRequest) {
    const myCasesFilter: MyCasesFilterRequest = {
      fullName: request.fullName,
      caseCode: request.caseCode,
      status: request.status,
      caseType: request.caseType,
    };

    if (this.isFirstFilterRun) {
      this.isFirstFilterRun = false;
      this.filterRequest.set(myCasesFilter);
      return;
    }
    this.filterRequest.set(myCasesFilter);
    this.currentPage.set(1);
    this.loadCases();
  }

  onFilterReset() {
    this.filterRequest.set({});
    this.currentPage.set(1);
    this.loadCases();
  }

  private loadCases(): void {
    this.loading.set(true);

    const req = this.filterRequest();
    const filter: MyCasesFilterRequest = {
      ...req,
      page: this.currentPage(),
      pageSize: this.pageSize,
    };

    this.profileService.getMyCases(filter).subscribe({
      next: (response) => {
        if (!response.success) {
          this.toast.error(response.message || 'فشل تحميل الحالات');
          this.allCases.set([]);
          this.totalPages.set(0);
          this.totalCount.set(0);
          // Do not reset overallTotalCount here – keep the last known value
          this.initialLoad.set(false);
          this.loading.set(false);
          return;
        }

        const pagination = response.data;
        if (pagination) {
          this.allCases.set(pagination.items ?? []);
          this.totalPages.set(pagination.totalPages);
          this.totalCount.set(pagination.totalCount ?? 0);

          // Update overall total only when no filters are applied
          const hasActiveFilter = !!req && (
            (req.fullName && req.fullName.trim() !== '') ||
            (req.caseCode && req.caseCode.trim() !== '') ||
            req.caseType !== undefined || req.status !== undefined
          );
          if (!hasActiveFilter) {
            this.overallTotalCount.set(pagination.totalCount ?? 0);
          }
        } else {
          this.allCases.set([]);
          this.totalPages.set(0);
          this.totalCount.set(0);
        }
        this.initialLoad.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('تعذر الاتصال بالخادم');
        this.allCases.set([]);
        this.totalPages.set(0);
        this.totalCount.set(0);
        this.initialLoad.set(false);
        this.loading.set(false);
      },
    });
  }

  loadMore(): void {
    if (!this.hasNextPage() || this.loadingMore()) return;

    this.loadingMore.set(true);
    const nextPage = this.currentPage() + 1;

    const req = this.filterRequest();
    const filter: MyCasesFilterRequest = {
      ...req,
      page: nextPage,
      pageSize: this.pageSize,
    };

    this.profileService.getMyCases(filter).subscribe({
      next: (response) => {
        if (!response.success) {
          this.toast.error(response.message || 'فشل تحميل المزيد');
          this.loadingMore.set(false);
          return;
        }

        const pagination = response.data;
        if (pagination) {
          this.allCases.update((items) => [...items, ...pagination.items]);
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
  }

  requestDelete(caseId: number, caseType: CaseType | undefined): void {
    if (!caseType) {
      this.toast.error('نوع الحالة غير معروف');
      return;
    }

    this.modalConfig.set({
      title: 'حذف الحالة',
      message: 'هل أنت متأكد من حذف هذه الحالة؟',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      action: 'delete',
      caseId,
      caseType,
      variant: 'danger',
      icon: 'delete_forever',
    });
    this.showConfirmModal.set(true);
  }

  requestMarkAsFound(caseId: number, caseType: CaseType | undefined): void {
    if (!caseType) {
      this.toast.error('نوع الحالة غير معروف');
      return;
    }

    this.markAsFoundCaseId.set(caseId);
    this.markAsFoundCaseType.set(caseType);
    this.showMarkAsFoundModal.set(true);
  }

  handleMarkAsFoundConfirm(data: FoundPersonInfoRequest): void {
    const id = this.markAsFoundCaseId();
    const type = this.markAsFoundCaseType();
    if (!id || !type) return;

    let markRequest;
    switch (type) {
      case CaseType.Urgent:
        markRequest = this.urgentService.markAsFound(id, data);
        break;
      case CaseType.LongTerm:
        markRequest = this.longTermService.markAsFound(id, data);
        break;
      case CaseType.Unknown:
        markRequest = this.unknownService.markAsFound(id, data);
        break;
      default:
        return;
    }

    markRequest.subscribe({
      next: () => {
        this.allCases.update((items) =>
          items.map((item) =>
            item.id === id
              ? {
                ...item,
                status: CaseStatus.Found,
              }
              : item,
          ),
        );
        this.toast.success('تم تحديث الحالة بنجاح');
        
        const cachedState = this.cacheService.get<any>(UI_STATE_CACHE_KEY) || {};
        cachedState.showMarkAsFoundModal = false;
        cachedState.markAsFoundCaseId = null;
        cachedState.markAsFoundCaseType = null;
        this.cacheService.set(UI_STATE_CACHE_KEY, cachedState, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);
        
        this.showMarkAsFoundModal.set(false);
        this.markAsFoundCaseId.set(null);
        this.markAsFoundCaseType.set(null);
      },
      error: () => {
        this.toast.error('فشل تحديث الحالة');
      },
    });
  }

  closeMarkAsFoundModal(): void {
    this.showMarkAsFoundModal.set(false);
    this.markAsFoundCaseId.set(null);
    this.markAsFoundCaseType.set(null);
  }

  confirmAction(): void {
    const config = this.modalConfig();
    if (!config || !config.caseId || !config.caseType) return;

    this.showConfirmModal.set(false);
    const { caseId, caseType, action } = config;

    if (action === 'delete') {
      this.executeDelete(caseId, caseType);
    } else if (action === 'markAsFound') {
      this.showMarkAsFoundModal.set(true);
    }
    this.modalConfig.set(null);
  }

  private executeDelete(caseId: number, caseType: CaseType): void {
    let deleteRequest;
    switch (caseType) {
      case CaseType.Urgent:
        deleteRequest = this.urgentService.deleteCase(caseId);
        break;
      case CaseType.LongTerm:
        deleteRequest = this.longTermService.deleteCase(caseId);
        break;
      case CaseType.Unknown:
        deleteRequest = this.unknownService.deleteCase(caseId);
        break;
      default:
        return;
    }

    deleteRequest.subscribe({
      next: () => {
        this.allCases.update((items) => items.filter((item) => item.id !== caseId));
        // Decrement total count because a case was deleted
        this.totalCount.update((c) => Math.max(0, c - 1));
        // Also decrement overall total count if the deleted case was part of the unfiltered set
        this.overallTotalCount.update((c) => Math.max(0, c - 1));

        if (this.totalCount() === 0) {
          this.totalPages.set(0);
        }

        this.toast.success('تم حذف الحالة بنجاح');
        
        const cachedState = this.cacheService.get<any>(UI_STATE_CACHE_KEY) || {};
        cachedState.modalConfig = null;
        this.cacheService.set(UI_STATE_CACHE_KEY, cachedState, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);

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
