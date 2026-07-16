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

import { ProfileService } from '../../service/profile.service';
import { UrgentCaseService } from '../../../urgent-cases/services/urgent-case.service';
import { LongTermCaseService } from '../../../long-term-cases/services/long-term-case.service';
import { UnknownCaseService } from '../../../unknown-cases/services/unknown-case.service';
import { SnackbarService } from '../../../../core/services/toast.service';

import { MyCaseListItemResponse, MyCasesFilterRequest } from '../../model/profile.model';
import { CaseType } from '../../../../shared/enums/case-type';
import { CaseStatus } from '../../../../shared/enums/case-status';
import { FoundPersonInfoRequest } from '../../../../core/models/Cases.model';

import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { CaseCardCompactComponent } from '../../../../shared/components/cases-components/case-card-compact/case-card-compact.component';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { CardComponent } from '../../../../shared/components/card/card';

const CASE_TYPE_ORDER: CaseType[] = [CaseType.Urgent, CaseType.LongTerm, CaseType.Unknown];
const FILTER_DEBOUNCE_MS = 350;

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
    CaseHeaderComponent,
    FormField,
    CardComponent,
  ],
  templateUrl: './cases-tab.html',
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

  // Filters
  searchQuery = signal('');
  caseTypeFilter = signal<CaseType | ''>('');
  currentPage = signal(1);
  totalPages = signal(0);
  totalCount = signal(0); // total number of cases matching current filters
  overallTotalCount = signal(0); // total number of cases in the system (without any filter)
  readonly pageSize = 10;

  // Data – this is the filtered result from the backend
  allCases = signal<MyCaseListItemResponse[]>([]);
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
  } | null>(null);

  showMarkAsFoundModal = signal(false);
  markAsFoundCaseId = signal<number | null>(null);
  markAsFoundCaseType = signal<CaseType | null>(null);

  private isFirstFilterRun = true;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

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
    // Effect for filter changes – triggers backend fetch with debounce
    effect(() => {
      this.searchQuery();
      this.caseTypeFilter();

      if (this.isFirstFilterRun) {
        this.isFirstFilterRun = false;
        return;
      }

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
    this.loadCases();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  private loadCases(): void {
    this.loading.set(true);

    const filter: MyCasesFilterRequest = {
      page: this.currentPage(),
      pageSize: this.pageSize,
      fullName: this.searchQuery() || undefined,
      caseType: this.caseTypeFilter() || undefined,
    };

    this.profileService.getMyCases(filter).subscribe({
      next: (response) => {
        if (!response.success) {
          this.toast.error(response.message || 'فشل تحميل الحالات');
          this.allCases.set([]);
          this.totalPages.set(0);
          this.totalCount.set(0);
          // Do not reset overallTotalCount here – keep the last known value
          this.loading.set(false);
          return;
        }

        const pagination = response.data;
        if (pagination) {
          this.allCases.set(pagination.items ?? []);
          this.totalPages.set(pagination.totalPages);
          this.totalCount.set(pagination.totalCount ?? 0);

          // Update overall total only when no filters are applied
          const hasActiveFilter = this.searchQuery().trim() !== '' || this.caseTypeFilter() !== '';
          if (!hasActiveFilter) {
            this.overallTotalCount.set(pagination.totalCount ?? 0);
          }
        } else {
          this.allCases.set([]);
          this.totalPages.set(0);
          this.totalCount.set(0);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('تعذر الاتصال بالخادم');
        this.allCases.set([]);
        this.totalPages.set(0);
        this.totalCount.set(0);
        this.loading.set(false);
      },
    });
  }

  loadMore(): void {
    if (!this.hasNextPage() || this.loadingMore()) return;

    this.loadingMore.set(true);
    const nextPage = this.currentPage() + 1;

    const filter: MyCasesFilterRequest = {
      page: nextPage,
      pageSize: this.pageSize,
      fullName: this.searchQuery() || undefined,
      caseType: this.caseTypeFilter() || undefined,
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
      message: 'هل أنت متأكد من حذف هذه الحالة؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      action: 'delete',
      caseId,
      caseType,
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
