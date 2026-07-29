import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { MatchedCaseResponse } from '../../../../core/models/Cases.model';
import { getCaseTypeTranslationAr } from '../../../../core/constants/case.type.dictionary';
import { environment } from '../../../../../environments/environment';
import { CaseType } from '../../../../shared/enums/case-type';

/**
 * <app-force-create-popup>
 * Modernized Angular 21 component using signal inputs/outputs, standalone architecture, and Tailwind CSS.
 */
@Component({
  selector: 'app-force-create-popup',
  standalone: true,
  imports: [],
  templateUrl: './force-create-popup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForceCreatePopupComponent {
  readonly matches = input.required<MatchedCaseResponse[]>();
  readonly isBlocked = input(false);
  readonly cancel = output<void>();
  readonly forceCreate = output<void>();

  private readonly router = inject(Router);

  readonly baseUrl = environment.baseUrl;
  readonly placeholderImg = 'assets/images/no-photo-placeholder.png';

  getFullName(m: MatchedCaseResponse): string {
    return [m.fName, m.sName, m.tName, m.lName].filter(Boolean).join(' ') || 'غير معروف';
  }

  caseTypeLabel(type: MatchedCaseResponse['caseType']): string {
    return getCaseTypeTranslationAr(type);
  }

  caseTypeTagClass(type: MatchedCaseResponse['caseType']): string {
    switch (type) {
      case CaseType.Unknown:
      case 'Unknown' as unknown:
        return 'bg-[#fff3e0] text-[#e65100] border border-[#ffe0b2]';
      case CaseType.Urgent:
      case 'Urgent' as unknown:
        return 'bg-[#e8f5e9] text-[#1b5e20] border border-[#c8e6c9]';
      case CaseType.LongTerm:
      case 'LongTerm' as unknown:
        return 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  }

  formatSimilarity(m: MatchedCaseResponse): number {
    const score = m.matchScore ?? 0;
    return score > 0 && score <= 1 ? Math.round(score * 100) : Math.round(score);
  }

  onContact(m: MatchedCaseResponse): void {
    this.router.navigate(['/chat/start', m.id]);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement) === event.currentTarget) {
      this.cancel.emit();
    }
  }
}