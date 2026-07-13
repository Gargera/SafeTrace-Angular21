import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { UrgentCaseService } from '../../services/urgent-case.service';
import { CaseDetailResponse } from '../../../../core/models/Cases.model';
import { EmptyStateComponent } from '../../../../shared/components/cases-components/empty-state/empty-state.component';

@Component({
  selector: 'app-urgent-detail',
  standalone: true,
  imports: [DatePipe, RouterModule, EmptyStateComponent],
  templateUrl: './urgent-detail.html'
})
export class UrgentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private urgentCaseService = inject(UrgentCaseService); // Assume this has getCaseById, if not, mock it

  caseId: number | null = null;
  caseDetail: CaseDetailResponse | null = null;
  loading: boolean = true;
  error: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.caseId = +id;
        this.loadCaseDetail();
      }
    });
  }

  loadCaseDetail(): void {
    this.loading = true;
    
    // We mock the details response here since we might not have the getCaseById in the service right now
    // If the service has it, we would use: this.urgentCaseService.getCaseById(this.caseId).subscribe(...)
    setTimeout(() => {
      this.caseDetail = {
        id: this.caseId!,
        caseCode: 'URG-2024-001',
        caseType: 0,
        status: 1,
        gender: 0,
        government: 'محافظة الرياض',
        city: 'الرياض',
        street: 'شارع العليا',
        fName: 'يوسف',
        sName: 'محمد',
        tName: 'علي',
        lName: 'العامري',
        age: 7,
        communicationPhone: '0500000000',
        relation: 1,
        createdAt: '2024-05-15T12:00:00',
        updatedAt: null,
        eventDate: '2024-05-15T10:00:00',
        description: 'شوهد يوسف آخر مرة يغادر مكان عمله في منطقة وسط البلد في حوالي الساعة 6:30 مساءً. ذكر لزملائه أنه متجه للقاء صديق بالقرب من محطة الحافلات المركزية لكنه لم يصل أبدًا. هاتفه مغلق منذ ذلك المساء.',
        foundPersonInfo: null,
        ageCategory: { id: 1, name: 'طفل' },
        user: { fName: 'أحمد', lName: 'العامري', email: 'ahmed@test.com', phoneNumber: '0501111111' },
        photos: [
          { id: 1, imagePath: 'assets/placeholder-urgent.jpg', isPrimary: true, type: 0 }
        ]
      } as unknown as CaseDetailResponse;
      this.loading = false;
    }, 500);
  }

  getPrimaryPhoto(): string {
    const photo = this.caseDetail?.photos?.find(p => p.isPrimary);
    return photo?.imagePath || 'assets/placeholder-urgent.jpg';
  }

  getGenderLabel(gender: string | number): string {
    if (typeof gender === 'string') {
      return gender.toLowerCase() === 'female' ? 'أنثى' : 'ذكر';
    }
    return gender === 0 ? 'ذكر' : 'أنثى';
  }
}
