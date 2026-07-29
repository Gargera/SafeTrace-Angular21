import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { MatchedCaseResponse } from '../../../../core/models/Cases.model';
import { environment } from '../../../../../environments/environment';
import { CaseType } from '../../../../shared/enums/case-type';
import { CaseTypeBadgeDirective } from '../../../directives/case-type-badge-directive';

/**
 * <app-force-create-popup>
 *
 * Mode 1 — Hard Block  (isBlocked = true)
 *   • Matched case is LongTerm or Urgent → no Force Create, no Join Group.
 *
 * Mode 2 — Confirmation  (isBlocked = false)
 *   • Matched case is Unknown → Force Create always available.
 *   • Join Group additionally shown when canJoinGroup=true (Unknown creates only)
 *     and all matches are Unknown  → Unknown + Unknown scenario.
 */
@Component({
  selector: 'app-force-create-popup',
  standalone: true,
  imports: [CaseTypeBadgeDirective],
  templateUrl: './force-create-popup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForceCreatePopupComponent {
  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly matches = input.required<MatchedCaseResponse[]>();
  readonly isBlocked = input(false);
  /** Pass true only from Unknown create — enables the Join Group button for Unknown+Unknown */
  readonly canJoinGroup = input(false);

  // ── Outputs ───────────────────────────────────────────────────────────────
  readonly cancel = output<void>();
  readonly forceCreate = output<void>();
  /** Emitted when the user chooses to attach this case to the existing duplicate group */
  readonly joinGroup = output<void>();

  // ── Private helpers ───────────────────────────────────────────────────────
  private readonly router = inject(Router);

  readonly baseUrl = environment.baseUrl;
  readonly placeholderImg = 'assets/images/no-photo-placeholder.png';

  // ── Computed state (drives the template declaratively) ────────────────────

  /** true  → Mode 1 (blocked), false → Mode 2 (confirmation) */
  readonly isBlockedMode = computed(() => this.isBlocked());

  /** Whether ALL matches are Unknown cases (affects confirmation wording) */
  readonly hasOnlyUnknownMatches = computed(() =>
    this.matches().length > 0 &&
    this.matches().every((m) => m.caseType === CaseType.Unknown)
  );

  /** Icon name (Material Symbols) */
  readonly popupIcon = computed(() =>
    this.isBlockedMode() ? 'block' : 'manage_search'
  );

  /** Icon colour class */
  readonly popupIconClass = computed(() =>
    this.isBlockedMode() ? 'text-red-600' : 'text-amber-500'
  );

  /** Header title */
  readonly popupTitle = computed(() =>
    this.isBlockedMode()
      ? 'تعذّر إنشاء البلاغ — حالة مكررة محمية'
      : 'تم رصد حالات مشابهة بالذكاء الاصطناعي'
  );

  /** Subtitle / description paragraph */
  readonly popupDescription = computed(() => {
    if (this.isBlockedMode()) {
      return 'تم العثور على حالة نشطة من نوع محمي (طويل الأمد أو عاجل). لا يُسمح بتكرار هذا النوع من البلاغات للحفاظ على موارد البحث. يمكنك التواصل مع المُبلغ الأصلي من خلال الأزرار أدناه.';
    }
    if (this.showJoinGroup()) {
      return `تم رصد ${this.matches().length} حالة مجهولة الهوية مشابهة. يمكنك ضم بلاغك إلى مجموعة البلاغات المكررة الحالية، أو تجاهل التطابق وإنشاء بلاغ مستقل.`;
    }
    return `تم رصد ${this.matches().length} حالة مشابهة باستخدام تقنية التعرف على الوجه. يمكنك المتابعة إذا كنت متأكدًا أن هذه حالة جديدة مستقلة.`;
  });

  /** Label for the close/cancel button */
  readonly cancelLabel = computed(() =>
    this.isBlockedMode() ? 'إغلاق' : 'إلغاء'
  );

  /** Whether to show the Force Create button (hidden when Join Group is shown) */
  readonly canForceCreate = computed(() => !this.isBlockedMode() && !this.showJoinGroup());

  /** Whether to show the Join Group button (Unknown + Unknown only) */
  readonly showJoinGroup = computed(() =>
    !this.isBlockedMode() && this.canJoinGroup() && this.hasOnlyUnknownMatches()
  );

  // ── Per-match helpers ─────────────────────────────────────────────────────

  getFullName(m: MatchedCaseResponse): string {
    return [m.fName, m.sName, m.tName, m.lName].filter(Boolean).join(' ') || 'غير معروف';
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