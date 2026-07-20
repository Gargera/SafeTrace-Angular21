 import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UrgentCaseService } from '../../../features/urgent-cases/services/urgent-case.service';
import { LongTermCaseService } from '../../../features/long-term-cases/services/long-term-case.service';
import { UnknownCaseService } from '../../../features/unknown-cases/services/unknown-case.service';
import { FoundedService } from '../../../features/founded/services/founded.service';
import { CaseCardComponent } from '../cases-components/case-card/case-card.component';
import { ComplaintsService } from '../../../features/complaints/services/complaints.service';
import { SnackbarService } from '../../../core/services/toast.service';

declare const Swal: any;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CaseCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  private urgentSvc = inject(UrgentCaseService);
  private longTermSvc = inject(LongTermCaseService);
  private unknownSvc = inject(UnknownCaseService);
  private foundedSvc = inject(FoundedService);
  private complaintSvc = inject(ComplaintsService);
  private snackbar = inject(SnackbarService);

  urgentCases = signal<any[]>([]);
  longTermCases = signal<any[]>([]);
  unknownCases = signal<any[]>([]);
  foundedCases = signal<any[]>([]);

  complaintForm = { caseCode: '', contactType: '', message: '' };
  isSendingComplaint = signal(false);

  contactTypeOptions = [
    'تحديث معلومة',
    'مشكلة تقنية',
    'استفسار عام',
    'بلاغ عن خطأ',
    'أخرى'
  ];

  ngOnInit() {
    this.urgentSvc.getAllCases({ pageNumber: 1, pageSize: 4 } as any).subscribe({
      next: (res: any) => {
        const items = res?.data?.items ?? res?.items ?? [];
        this.urgentCases.set(items.slice(0, 4));
      }
    });

    this.longTermSvc.getAllCases({ pageNumber: 1, pageSize: 4 } as any).subscribe({
      next: (res: any) => {
        const items = res?.data?.items ?? res?.items ?? [];
        this.longTermCases.set(items.slice(0, 4));
      }
    });

    this.unknownSvc.getAllCases({ pageNumber: 1, pageSize: 4 } as any).subscribe({
      next: (res: any) => {
        const items = res?.data?.items ?? res?.items ?? [];
        this.unknownCases.set(items.slice(0, 4));
      }
    });

    this.foundedSvc.getAll({ page: 1, pageSize: 4 } as any).subscribe({
      next: (res: any) => {
        const items = res?.items ?? res?.data?.items ?? [];
        this.foundedCases.set(items.slice(0, 4));
      }
    });
  }

  submitComplaint() {
    if (!this.complaintForm.message.trim()) {
      Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'يرجى كتابة نص الرسالة', confirmButtonText: 'حسناً' });
      return;
    }
    this.isSendingComplaint.set(true);
    const message = this.complaintForm.contactType
      ? `[${this.complaintForm.contactType}] ${this.complaintForm.message}`
      : this.complaintForm.message;

    this.complaintSvc.createComplaint({
      caseCode: this.complaintForm.caseCode || undefined,
      message
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'تم الإرسال!', text: 'تم إرسال رسالتك بنجاح، سيتواصل معك فريقنا قريباً', confirmButtonText: 'حسناً' });
          this.complaintForm = { caseCode: '', contactType: '', message: '' };
        }
        this.isSendingComplaint.set(false);
      },
      error: () => {
        Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة مرة أخرى', confirmButtonText: 'حسناً' });
        this.isSendingComplaint.set(false);
      }
    });
  }
  onImgError(event: Event) {
  (event.target as HTMLImageElement).src = '/images/defaultUser.jpg';
}
}
