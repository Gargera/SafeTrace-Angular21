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
import { CACHE_TAGS, CACHE_TTL, PROFILE_CACHE_KEYS } from '../../../../core/cache/cache.constants';

import { MyCaseListItemResponse, MyCasesFilterRequest } from '../../model/profile.model';
import { CaseType } from '../../../../shared/enums/case-type';
import { CaseStatus } from '../../../../shared/enums/case-status';
import { FoundPersonInfoRequest, CasesFilterRequest } from '../../../../core/models/cases.model';

import { CardSkeletonComponent } from '../../../../shared/components/skeletons/card-skeleton/card-skeleton.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { CaseCardCompactComponent } from '../../../../shared/components/cases-components/case-card-compact/case-card-compact.component';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { FoundedPopupComponent } from '../../../../shared/components/cases-components/founded-popup/founded-popup.component';

import { extractErrorMessage } from '../../../../shared/helper/error.helper';

const UI_STATE_CACHE_KEY = PROFILE_CACHE_KEYS.UI_MY_CASES;

@Component({
  selector: 'app-my-cases-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardSkeletonComponent,
    CaseCardCompactComponent,
    EmptyStateComponent,
    ConfirmationModalComponent,
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
  protected readonly PROFILE_CACHE_KEYS = PROFILE_CACHE_KEYS;

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

  // Computed
  // No local filtering – all filtering is done by the backend.
  filteredCases = computed(() => this.allCases());

  hasActiveFilters = computed(() => {
    const req = this.filterRequest();
    return (
      !!req &&
      !!(req.fullName || req.caseCode || req.caseType !== undefined || req.status !== undefined)
    );
  });

  // Whether the current filtered list has results
  hasResults = computed(() => this.allCases().length > 0);

  // Total count for header badge (filtered results)
  totalCases = computed(() => this.totalCount());

  hasNextPage = computed(() => this.currentPage() < this.totalPages());

  sortedCases = computed(() =>
    [...this.filteredCases()].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }),
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      const state: any = {
        filterRequest: this.filterRequest(),
        currentPage: this.currentPage(),
      };

      if (this.showMarkAsFoundModal() && this.markAsFoundCaseId()) {
        const hasDraft = this.cacheService.has(
          `${PROFILE_CACHE_KEYS.DRAFT_POPUP_MARK_AS_FOUND}_${this.markAsFoundCaseId()}`,
        );
        if (hasDraft) {
          state.markAsFoundCaseId = this.markAsFoundCaseId();
          state.markAsFoundCaseType = this.markAsFoundCaseType();
        }
      }

      this.cacheService.set(UI_STATE_CACHE_KEY, state, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);
    });
  }

  ngOnInit(): void {
    const cachedState = this.cacheService.get<any>(UI_STATE_CACHE_KEY);
    if (cachedState) {
      if (cachedState.filterRequest) this.filterRequest.set(cachedState.filterRequest);
      if (cachedState.currentPage) this.currentPage.set(cachedState.currentPage);

      if (cachedState.markAsFoundCaseId && cachedState.markAsFoundCaseType) {
        if (
          this.cacheService.has(
            `${PROFILE_CACHE_KEYS.DRAFT_POPUP_MARK_AS_FOUND}_${cachedState.markAsFoundCaseId}`,
          )
        ) {
          this.markAsFoundCaseId.set(cachedState.markAsFoundCaseId);
          this.markAsFoundCaseType.set(cachedState.markAsFoundCaseType);
          this.showMarkAsFoundModal.set(true);
        }
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

    const prev = this.filterRequest();
    const unchanged =
      prev.fullName === myCasesFilter.fullName &&
      prev.caseCode === myCasesFilter.caseCode &&
      prev.status === myCasesFilter.status &&
      prev.caseType === myCasesFilter.caseType;

    this.filterRequest.set(myCasesFilter);

    if (unchanged) return; // nothing actually changed, skip API call

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

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const threshold = 100;
    const reachedBottom = target.scrollHeight - target.scrollTop - target.clientHeight <= threshold;

    if (reachedBottom && !this.loadingMore() && this.hasNextPage() && !this.loading()) {
      this.loadMore();
    }
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

    const caseItem = this.allCases().find((item) => item.id === caseId);
    if (caseItem?.status === CaseStatus.Found) {
      this.toast.error('لا يمكن حذف حالة تم العثور عليها');
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

  isSubmitting = signal(false);

  handleMarkAsFoundConfirm(data: FoundPersonInfoRequest): void {
    const id = this.markAsFoundCaseId();
    const type = this.markAsFoundCaseType();
    if (!id || !type || this.isSubmitting()) return;

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

    this.isSubmitting.set(true);
    markRequest.subscribe({
      next: () => {
        this.isSubmitting.set(false);
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

        this.cacheService.remove(`FoundedPopup_Profile_${id}`);
        this.showMarkAsFoundModal.set(false);
        this.markAsFoundCaseId.set(null);
        this.markAsFoundCaseType.set(null);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(extractErrorMessage(err, 'فشل تحديث الحالة'));
      },
    });
  }

  closeMarkAsFoundModal(): void {
    if (this.markAsFoundCaseId()) {
      this.cacheService.remove(
        `${PROFILE_CACHE_KEYS.DRAFT_POPUP_MARK_AS_FOUND}_${this.markAsFoundCaseId()}`,
      );
    }
    this.showMarkAsFoundModal.set(false);
    this.markAsFoundCaseId.set(null);
    this.markAsFoundCaseType.set(null);
  }

  confirmAction(): void {
    const config = this.modalConfig();
    if (!config || !config.caseId || !config.caseType) return;

    const { caseId, caseType, action } = config;

    if (action === 'delete') {
      this.executeDelete(caseId, caseType);
    } else if (action === 'markAsFound') {
      this.showConfirmModal.set(false);
      this.showMarkAsFoundModal.set(true);
      this.modalConfig.set(null);
    }
  }

  private executeDelete(caseId: number, caseType: CaseType): void {
    if (this.isSubmitting()) return;

    const caseItem = this.allCases().find((item) => item.id === caseId);
    if (caseItem?.status === CaseStatus.Found) {
      this.toast.error('لا يمكن حذف حالة تم العثور عليها');
      return;
    }

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

    this.isSubmitting.set(true);
    deleteRequest.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.allCases.update((items) => items.filter((item) => item.id !== caseId));
        this.totalCount.update((c) => Math.max(0, c - 1));
        if (this.totalCount() === 0) {
          this.totalPages.set(0);
        }

        this.toast.success('تم حذف الحالة بنجاح');
        this.showConfirmModal.set(false);
        this.modalConfig.set(null);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(extractErrorMessage(err, 'فشل حذف الحالة'));
      },
    });
  }

  closeModal(): void {
    this.showConfirmModal.set(false);
    this.modalConfig.set(null);
  }
}
