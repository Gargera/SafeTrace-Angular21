import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
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
// import { MarkAsFoundModalComponent } from '../../shared/mark-as-found-modal/mark-as-found-modal.component';

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
    // MarkAsFoundModalComponent,
  ],
  templateUrl: './cases-tab.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyCasesTab implements OnInit {
  // Expose enums to template
  protected readonly CaseType = CaseType;
  protected readonly CaseStatus = CaseStatus;

  // Services
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
  readonly pageSize = 10;

  // Data
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

  // Computed
  hasNextPage = computed(() => this.currentPage() < this.totalPages());
  totalCases = computed(() => this.allCases().length);

  groupedCases = computed(() => {
    const cases = this.allCases();
    const map = new Map<CaseType, MyCaseListItemResponse[]>();
    for (const item of cases) {
      if (!map.has(item.caseType)) map.set(item.caseType, []);
      map.get(item.caseType)!.push(item);
    }

    const labels: Record<CaseType, string> = {
      [CaseType.Urgent]: 'حالات عاجلة',
      [CaseType.LongTerm]: 'حالات مفقودين طويل الأمد',
      [CaseType.Unknown]: 'حالات مجهولة الهوية',
    };

    return Array.from(map.entries()).map(([type, items]) => ({
      type,
      label: labels[type] || 'حالات',
      cases: items,
    }));
  });

  // Lifecycle
  ngOnInit(): void {
    this.loadCases();

    // Auto-reload when filters change
    effect(() => {
      if (this.searchQuery() !== undefined || this.caseTypeFilter() !== undefined) {
        this.currentPage.set(1);
        this.loadCases();
      }
    });
  }

  // ---- Data Loading ----
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
          this.loading.set(false);
          return;
        }

        const pagination = response.data;
        if (pagination) {
          this.allCases.set(pagination.items);
          this.totalPages.set(pagination.totalPages);
        } else {
          this.allCases.set([]);
          this.totalPages.set(0);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('تعذر الاتصال بالخادم');
        this.allCases.set([]);
        this.totalPages.set(0);
        this.loading.set(false);
      },
    });
  }

  // ---- Load More ----
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
        }
        this.loadingMore.set(false);
      },
      error: () => {
        this.toast.error('تعذر الاتصال بالخادم');
        this.loadingMore.set(false);
      },
    });
  }

  // ---- Delete ----
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

  // ---- Mark as Found ----
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
        // تحديث الحالة محلياً
        this.allCases.update((items) =>
          items.map((item) => (item.id === id ? { ...item, status: CaseStatus.Found } : item)),
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

  // ---- Confirmation Modal ----
  confirmAction(): void {
    const config = this.modalConfig();
    if (!config || !config.caseId || !config.caseType) return;

    this.showConfirmModal.set(false);
    const { caseId, caseType, action } = config;

    if (action === 'delete') {
      this.executeDelete(caseId, caseType);
    } else if (action === 'markAsFound') {
      // This path is not used now because we use separate modal, but keep for consistency
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