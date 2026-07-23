import { Component, computed, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ComplaintsService } from '../../services/complaints.service';
import { ComplaintResponseDto } from '../../models/complaint.model';
import { ComplaintFilterDto } from '../../models/complaint-filter.model';
import { ResolveComplaintDto } from '../../models/resolve-complaint.model';
import { ComplaintStatus } from '../../../../shared/enums/complaint-status';
import { ComplaintStatisticsDto } from '../../models/complaint-statistics-dto';
import { ComplaintStatusBadgeDirective } from '../../../../shared/directives/complaint-status-badge-directive';
import { TruncatePipe } from '../../../../shared/pipes/truncate-pipe';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { CardComponent } from '../../../../shared/components/card/card';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { SnackbarService } from '../../../../core/services/toast.service';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { Permissions } from '../../../../core/constants/Permissions';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';

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
    CaseHeaderComponent,
    ConfirmationModalComponent,
    HasPermissionDirective
  ],
  templateUrl: './complaints-list.html',
  styleUrl: './complaints-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplaintsList implements OnInit {
  private svc = inject(ComplaintsService);
  Permissions = Permissions;
  complaintActionPermissions = [
    Permissions.Complaints.GetById,
    Permissions.Complaints.HardDelete
  ];
  private toast = inject(SnackbarService);

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
  });

  pagesArray = computed(() => {
    const current = this.filter().pageNumber;
    const total = this.totalPages();
    const pages: number[] = [];
    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);

    if (current <= 3) {
      end = Math.min(total, 5);
    }
    if (current >= total - 2) {
      start = Math.max(1, total - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  ComplaintStatusEnum = ComplaintStatus;
  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.loadStatistics();
    this.loadComplaints();

    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((term) => {
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
        this.toast.error(err.error?.detail || err.error?.title || 'تعذر الاتصال بالخادم لتحميل الإحصائيات');
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
        this.toast.error(err.error?.detail || err.error?.title || 'تعذر الاتصال بالخادم لتحميل الشكاوى');
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

  resetFilters() {
    this.filter.set({
      pageNumber: 1,
      pageSize: 10,
      search: '',
      status: '' as any,
    });
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
          this.closeDetailsModal();
          this.loadComplaints();
          this.loadStatistics();
        } else {
           this.toast.error(res.message || 'حدث خطأ أثناء حل الشكوى');
        }
        this.isResolving.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.detail || err.error?.title || 'حدث خطأ أثناء حل الشكوى');
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
          this.closeDeleteModal();
          this.loadComplaints();
          this.loadStatistics();
        } else {
          this.toast.error(res.message || 'حدث خطأ أثناء החذف');
        }
      },
      error: (err) => {
        this.toast.error(err.error?.detail || err.error?.title || 'حدث خطأ أثناء الحذف');
      }
    });
  }
}