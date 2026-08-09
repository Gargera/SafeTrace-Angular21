import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CacheService } from '../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';
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
import { caseCodeValidator } from '../../../../shared/validators/case-code.validator';
import { CaseStatus } from '../../../../shared/enums/case-status';
import { Gender } from '../../../../shared/enums/gender';
import { CaseListItemResponse } from '../../../../core/models/cases.model';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';

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
  private cacheService = inject(CacheService);
  private destroyRef = inject(DestroyRef);
  private readonly DRAFT_CACHE_KEY = 'Home_Complaint_Draft';

  urgentCases = signal<any[]>([]);
  longTermCases = signal<any[]>([]);
  unknownCases = signal<any[]>([]);
  foundedCases = signal<any[]>([]);

  private fb = inject(FormBuilder);
  
  complaintForm!: FormGroup;
  isSendingComplaint = signal(false);

  contactTypeOptions = [
    'بلاغ عن حالة احتيال أو ابتزاز',
    'محتوى غير لائق',
    'مشكلة تقنية',
    'اقتراح لتحسين المنصة',
    'أخرى'
  ];

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.complaintForm && this.complaintForm.dirty) {
        this.cacheService.set(this.DRAFT_CACHE_KEY, this.complaintForm.value, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);
      }
    });
  }

  ngOnInit() {
    this.complaintForm = this.fb.group({
      complaintTargetType: ['', Validators.required],
      caseCode: [''],
      contactType: [''],
      message: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]]
    });

    this.complaintForm.get('complaintTargetType')?.valueChanges.subscribe(type => {
      const caseCodeControl = this.complaintForm.get('caseCode');
      const contactTypeControl = this.complaintForm.get('contactType');

      if (type === 'case') {
        caseCodeControl?.setValidators([Validators.required, caseCodeValidator()]);
        contactTypeControl?.clearValidators();
        contactTypeControl?.setValue('');
      } else if (type === 'general') {
        contactTypeControl?.setValidators([Validators.required]);
        caseCodeControl?.clearValidators();
        caseCodeControl?.setValue('');
      }
      
      caseCodeControl?.updateValueAndValidity();
      contactTypeControl?.updateValueAndValidity();
    });

    const draft = this.cacheService.get<any>(this.DRAFT_CACHE_KEY);
    if (draft) {
      this.complaintForm.patchValue(draft);
      this.complaintForm.markAsDirty();
    }

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
    const message = formValue.complaintTargetType === 'general' && formValue.contactType
      ? `[${formValue.contactType}] ${formValue.message}`
      : formValue.message;

    this.complaintSvc.createComplaint({
      caseCode: formValue.complaintTargetType === 'case' ? formValue.caseCode : undefined,
      message
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.snackbar.success('تم إرسال رسالتك بنجاح، سيتواصل معك فريقنا قريباً');
          this.complaintForm.reset();
          this.cacheService.remove(this.DRAFT_CACHE_KEY);
        }
        this.isSendingComplaint.set(false);
      },
      error: (err) => {
        this.snackbar.error(err.error?.message || extractErrorMessage(err, 'حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة مرة أخرى'));
        this.isSendingComplaint.set(false);
      }
    });
  }

  onContactReporter(caseId: number, type: 'urgent' | 'long-term' | 'unknown'): void {
    this.router.navigate([`/${type}`, caseId], {
      queryParams: { contact: true },
    });
  }

  mapToCaseItem(person: any): CaseListItemResponse {
    return {
      id: person.id,
      caseCode: '',
      caseType: person.caseType,
      status: CaseStatus.Found,
      fName: person.fullName,
      sName: null,
      tName: null,
      lName: null,
      gender: Gender.Male,
      age: person.age,
      city: '',
      government: '',
      createdAt: person.foundDate,
      mainPhoto: person.mainImage,
    };
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
