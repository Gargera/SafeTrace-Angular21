import { Component, computed, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ComplaintsService } from '../../services/complaints.service';
import { ComplaintResponseDto } from '../../models/responses/complaint.model';
import { ComplaintFilterDto } from '../../models/requests/complaint-filter.model';
import { ResolveComplaintDto } from '../../models/requests/resolve-complaint.model';
import { ComplaintStatus } from '../../../../shared/enums/complaint-status';
import { ComplaintStatisticsDto } from '../../models/responses/complaint-statistics-dto';
import { ComplaintStatusBadgeDirective } from '../../../../shared/directives/complaint-status-badge-directive';
import { TruncatePipe } from '../../../../shared/pipes/truncate-pipe';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { CardComponent } from '../../../../shared/components/card/card';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { Permissions } from '../../../../core/constants/Permissions';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { ReportService } from '../../../admin-dashboard/services/report.service';
import { CacheService } from '../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';

const UI_STATE_CACHE_KEY = 'ComplaintsList_UI_State';

@Component({
  selector: 'app-complaints-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ComplaintStatusBadgeDirective,
    TruncatePipe,
    FormField,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    HeaderComponent,
    ConfirmationModalComponent,
    HasPermissionDirective,
    PaginationComponent
  ],
  templateUrl: './complaints-list.html',
  styleUrl: './complaints-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplaintsList implements OnInit {
  private svc = inject(ComplaintsService);
  private readonly cacheService = inject(CacheService);
  private readonly destroyRef = inject(DestroyRef);
  Permissions = Permissions;
  complaintActionPermissions = [
    Permissions.Complaints.GetById,
    Permissions.Complaints.HardDelete
  ];
  private toast = inject(SnackbarService);
  private reportService = inject(ReportService);

  complaints = signal<ComplaintResponseDto[]>([]);
  totalCount = signal<number>(0);
  totalPages = signal<number>(0);
  isLoading = signal<boolean>(false);
  loadingStats = signal<boolean>(true);
  statistics = signal<ComplaintStatisticsDto | null>(null);

  selectedComplaint = signal<ComplaintResponseDto | null>(null);
  showDetailsModal = signal<boolean>(false);
  solutionMessage = signal<string>('');
  isResolving = signal<boolean>(false);

  showDeleteModal = signal<boolean>(false);
  complaintToDelete = signal<ComplaintResponseDto | null>(null);

  filter = signal<ComplaintFilterDto>({
    pageNumber: 1,
    pageSize: 10,
    search: '',
    status: '' as any,
    contactType: ''
  });

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.status || f.contactType);
  });

  resetFilters(): void {
    this.filter.set({
      pageNumber: 1,
      pageSize: 10,
      search: '',
      status: '' as any,
      contactType: ''
    });
    this.loadComplaints();
  }

  contactTypeOptions = [
    'شكوى حالة',
    'بلاغ عن حالة احتيال أو ابتزاز',
    'محتوى غير لائق',
    'مشكلة فنية',
    'اقتراح لتحسين المنصة',
    'أخرى'
  ];

  ComplaintStatusEnum = ComplaintStatus;
  private searchSubject = new Subject<string>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cacheService.set(
        UI_STATE_CACHE_KEY,
        {
          filter: this.filter(),
          showDetailsModal: this.showDetailsModal(),
          selectedComplaint: this.selectedComplaint(),
          solutionMessage: this.solutionMessage(),
          showDeleteModal: this.showDeleteModal(),
          complaintToDelete: this.complaintToDelete()
        },
        CACHE_TTL.UI_STATE,
        [CACHE_TAGS.UI_STATE]
      );
    });
  }

  ngOnInit() {
    const cachedState = this.cacheService.get<any>(UI_STATE_CACHE_KEY);
    if (cachedState) {
      if (cachedState.filter) this.filter.set(cachedState.filter);

      if (cachedState.showDetailsModal && cachedState.selectedComplaint) {
        this.selectedComplaint.set(cachedState.selectedComplaint);
        this.solutionMessage.set(cachedState.solutionMessage || '');
        this.showDetailsModal.set(true);
      } else if (cachedState.showDeleteModal && cachedState.complaintToDelete) {
        this.complaintToDelete.set(cachedState.complaintToDelete);
        this.showDeleteModal.set(true);
      }
    }

    this.loadStatistics();
    this.loadComplaints();

    this.searchSubject
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term: string) => {
        this.updateFilter({ search: term, pageNumber: 1 });
      });
  }

  loadStatistics() {
    this.loadingStats.set(true);
    this.svc.getStatistics().subscribe({
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

  loadComplaints() {
    this.isLoading.set(true);
    this.svc.getAll(this.filter()).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.complaints.set(res.data.items);
          this.totalCount.set(res.data.totalCount);
          this.totalPages.set(res.data.totalPages ?? Math.ceil(res.data.totalCount / this.filter().pageSize));
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toast.error(extractErrorMessage(err, 'تعذر الاتصال بالخادم لتحميل الشكاوى'));
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(value: string) {
    this.searchSubject.next(value);
  }

  updateFilter(partialFilter: Partial<ComplaintFilterDto>) {
    this.filter.update((f) => ({
      ...f,
      ...partialFilter,
      pageNumber: partialFilter.pageNumber ?? 1,
    }));
    this.loadComplaints();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.filter.update((f) => ({ ...f, pageNumber: page }));
      this.loadComplaints();
    }
  }

  openDetails(complaint: ComplaintResponseDto) {
    this.selectedComplaint.set(complaint);
    this.solutionMessage.set('');
    this.showDetailsModal.set(true);
  }

  closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedComplaint.set(null);
  }

  resolveComplaint() {
    const complaint = this.selectedComplaint();
    const msg = this.solutionMessage().trim();
    if (!complaint || !msg) {
      this.toast.error('يرجى كتابة رسالة الحل');
      return;
    }

    this.isResolving.set(true);
    const dto: ResolveComplaintDto = { solutionMessage: msg };
    this.svc.resolve(complaint.id, dto).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('تم حل الشكوى وإشعار المستخدم بنجاح');

          const cachedState = this.cacheService.get<any>(UI_STATE_CACHE_KEY) || {};
          cachedState.showDetailsModal = false;
          cachedState.solutionMessage = '';
          cachedState.selectedComplaint = null;
          this.cacheService.set(UI_STATE_CACHE_KEY, cachedState, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);

          this.closeDetailsModal();
          this.loadComplaints();
          this.loadStatistics();
        } else {
          this.toast.error(res.message || 'حدث خطأ أثناء حل الشكوى');
        }
        this.isResolving.set(false);
      },
      error: (err) => {
        this.toast.error(extractErrorMessage(err, 'حدث خطأ أثناء حل الشكوى'));
        this.isResolving.set(false);
      }
    });
  }

  openDeleteModal(complaint: ComplaintResponseDto) {
    this.complaintToDelete.set(complaint);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.complaintToDelete.set(null);
  }

  confirmDelete() {
    const complaint = this.complaintToDelete();
    if (!complaint) return;

    this.svc.deleteComplaint(complaint.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('تم حذف الشكوى بنجاح');

          const cachedState = this.cacheService.get<any>(UI_STATE_CACHE_KEY) || {};
          cachedState.showDeleteModal = false;
          cachedState.complaintToDelete = null;
          this.cacheService.set(UI_STATE_CACHE_KEY, cachedState, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);

          this.closeDeleteModal();
          this.loadComplaints();
          this.loadStatistics();
        } else {
          this.toast.error(res.message || 'حدث خطأ أثناء החذف');
        }
      },
      error: (err) => {
        this.toast.error(extractErrorMessage(err, 'حدث خطأ أثناء الحذف'));
      }
    });
  }
  downloadReport(): void {
    const filter = {
      ...this.filter(),
      status: this.filter().status || null
    };
    this.reportService
      .generateComplaintPdfReport(filter)
      .subscribe({
        next: (response) => {
          this.reportService.download(response);
        },
        error: (err) => {
          const message = extractErrorMessage(err, 'حدث خطأ أثناء تنزيل التقرير');
          this.toast.error(message);
        }
      });
  }

}