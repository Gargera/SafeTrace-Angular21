 import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { UrgentCaseService } from '../../../../features/urgent-cases/services/urgent-case.service';
import { LongTermCaseService } from '../../../../features/long-term-cases/services/long-term-case.service';
import { UnknownCaseService } from '../../../../features/unknown-cases/services/unknown-case.service';
import { FoundedService } from '../../../../features/founded/services/founded.service';
import { CaseCardComponent } from '../../../../shared/components/cases-components/case-card/case-card.component';
import { ComplaintsService } from '../../../../features/complaints/services/complaints.service';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { CardComponent } from '../../../../shared/components/card/card';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, CaseCardComponent, ButtonComponent, FormField, CardComponent],
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
  private router = inject(Router);

  urgentCases = signal<any[]>([]);
  longTermCases = signal<any[]>([]);
  unknownCases = signal<any[]>([]);
  foundedCases = signal<any[]>([]);

  private fb = inject(FormBuilder);
  
  complaintForm!: FormGroup;
  isSendingComplaint = signal(false);

  contactTypeOptions = [
    'تحديث معلومة',
    'مشكلة تقنية',
    'استفسار عام',
    'بلاغ عن خطأ',
    'أخرى'
  ];

  ngOnInit() {
    this.complaintForm = this.fb.group({
      caseCode: [''],
      contactType: [''],
      message: ['', [Validators.required]]
    });

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
    if (this.complaintForm.invalid) {
      this.complaintForm.markAllAsTouched();
      return;
    }
    this.isSendingComplaint.set(true);
    const formValue = this.complaintForm.value;
    const message = formValue.contactType
      ? `[${formValue.contactType}] ${formValue.message}`
      : formValue.message;

    this.complaintSvc.createComplaint({
      caseCode: formValue.caseCode || undefined,
      message
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.snackbar.success('تم إرسال رسالتك بنجاح، سيتواصل معك فريقنا قريباً');
          this.complaintForm.reset();
        }
        this.isSendingComplaint.set(false);
      },
      error: (err) => {
        this.snackbar.error(err.error?.message || err.error?.detail || 'حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة مرة أخرى');
        this.isSendingComplaint.set(false);
      }
    });
  }

  onContactReporter(caseId: number, type: 'urgent' | 'long-term' | 'unknown'): void {
    this.router.navigate([`/${type}`, caseId], {
      queryParams: { contact: true },
    });
  }

  getImageUrl(path: string | undefined): string {
    if (!path) return '/images/defaultUser.jpg';
    if (path.startsWith('http')) return path;
    return `${environment.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  onImgError(event: Event) {
  (event.target as HTMLImageElement).src = '/images/defaultUser.jpg';
}
}
