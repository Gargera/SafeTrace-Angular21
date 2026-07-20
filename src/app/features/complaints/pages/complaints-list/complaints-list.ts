 import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ComplaintsService } from '../../services/complaints.service';
import { ComplaintResponseDto } from '../../models/complaint.model';
import { ComplaintFilterDto } from '../../models/complaint-filter.model';
import { ResolveComplaintDto } from '../../models/resolve-complaint.model';
import { ComplaintStatus } from '../../../../shared/enums/complaint-status';
import { ComplaintStatisticsDto } from '../../models/ComplaintStatisticsDto';
import { ComplaintStatusBadgeDirective } from '../../../../shared/directives/complaint-status-badge-directive';

declare const Swal: any;

@Component({
  selector: 'app-complaints-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ComplaintStatusBadgeDirective],
  templateUrl: './complaints-list.html',
  styleUrl: './complaints-list.css'
})
export class ComplaintsList implements OnInit {
  private svc = inject(ComplaintsService);

  complaints = signal<ComplaintResponseDto[]>([]);
  allLoadedItems: ComplaintResponseDto[] = [];
  totalCount = signal(0);
  totalPages = signal(0);
  isLoading = signal(false);
  statistics = signal<ComplaintStatisticsDto | null>(null);

  selectedComplaint = signal<ComplaintResponseDto | null>(null);
  showModal = signal(false);
  solutionMessage = '';
  isResolving = signal(false);

  filter: ComplaintFilterDto = { pageNumber: 1, pageSize: 10 };
  searchEmail = '';
  searchCaseCode = '';
  selectedStatus = '';

  ComplaintStatus = ComplaintStatus;

  private emailSubject = new Subject<string>();
  private codeSubject = new Subject<string>();

  ngOnInit() {
    this.loadComplaints();
    this.loadStatistics();

    this.emailSubject
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.applyFilters());

    this.codeSubject
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.applyFilters());
  }

  loadStatistics() {
    this.svc.getStatistics().subscribe({
      next: (res) => { if (res.success && res.data) this.statistics.set(res.data); }
    });
  }

  loadComplaints() {
    this.isLoading.set(true);
    this.svc.getAll(this.filter).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.allLoadedItems = res.data.items;
          this.applyClientFilter();
          this.totalCount.set(res.data.totalCount);
          this.totalPages.set(
            res.data.totalPages ?? Math.ceil(res.data.totalCount / this.filter.pageSize)
          );
        }
        this.isLoading.set(false);
      },
      error: () => { this.isLoading.set(false); }
    });
  }

  private applyClientFilter() {
    let items = [...this.allLoadedItems];
    if (this.searchEmail.trim()) {
      items = items.filter(c =>
        c.userEmail.toLowerCase().includes(this.searchEmail.trim().toLowerCase())
      );
    }
    if (items.length === 0 && (this.searchEmail.trim() || this.searchCaseCode.trim())) {
      this.complaints.set([]);
    } else {
      this.complaints.set(items);
    }
  }

  private applyFilters() {
    this.filter.pageNumber = 1;
    this.filter.caseCode = this.searchCaseCode.trim() || undefined;
    this.filter.status = this.selectedStatus !== ''
      ? this.selectedStatus as ComplaintStatus
      : undefined;
    this.loadComplaints();
  }

  onEmailInput() {
    this.emailSubject.next(this.searchEmail);
  }

  onCodeInput() {
    this.codeSubject.next(this.searchCaseCode);
  }

  onStatusChange() {
    this.applyFilters();
  }

  openDetails(complaint: ComplaintResponseDto) {
    this.selectedComplaint.set(complaint);
    this.solutionMessage = '';
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedComplaint.set(null);
  }

  resolveComplaint() {
    const complaint = this.selectedComplaint();
    if (!complaint || !this.solutionMessage.trim()) {
      Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'يرجى كتابة رسالة الحل', confirmButtonText: 'حسناً' });
      return;
    }
    this.isResolving.set(true);
    const dto: ResolveComplaintDto = { solutionMessage: this.solutionMessage };
    this.svc.resolve(complaint.id, dto).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'تم!', text: 'تم حل الشكوى وإشعار المستخدم بنجاح', confirmButtonText: 'حسناً' });
          this.closeModal();
          this.loadComplaints();
          this.loadStatistics();
        }
        this.isResolving.set(false);
      },
      error: () => {
        Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء حل الشكوى', confirmButtonText: 'حسناً' });
        this.isResolving.set(false);
      }
    });
  }

  deleteComplaint(complaint: ComplaintResponseDto) {
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'سيتم حذف الشكوى نهائياً ولا يمكن التراجع!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'نعم، احذفها!',
      cancelButtonText: 'إلغاء'
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.svc.deleteComplaint(complaint.id).subscribe({
          next: (res) => {
            if (res.success) {
              Swal.fire({ icon: 'success', title: 'تم الحذف!', text: 'تم حذف الشكوى بنجاح', confirmButtonText: 'حسناً' });
              this.loadComplaints();
              this.loadStatistics();
            }
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء الحذف', confirmButtonText: 'حسناً' });
          }
        });
      }
    });
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.filter.pageNumber = page;
    this.loadComplaints();
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }
}