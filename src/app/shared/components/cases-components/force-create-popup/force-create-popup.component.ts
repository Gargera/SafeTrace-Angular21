import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatchedCaseResponse } from '../../../../core/models/cases.model';
import { environment } from '../../../../../environments/environment';
import { DuplicateDecision } from '../../../../shared/enums/duplicate-decision';
import { CaseTypeBadgeDirective } from '../../../directives/case-type-badge.directive';

import { ButtonComponent } from '../../button/button';
import { CardComponent } from '../../card/card';

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
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-force-create-popup',
  standalone: true,
  imports: [CaseTypeBadgeDirective, ButtonComponent, CardComponent, NgClass],
  templateUrl: './force-create-popup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForceCreatePopupComponent {
  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly matches = input.required<MatchedCaseResponse[]>();
  readonly isBlocked = input(false);
  readonly readOnly = input(false);
  readonly isSubmitting = input(false);
  readonly duplicateDecision = input<DuplicateDecision>(DuplicateDecision.None);

  // ── Outputs ───────────────────────────────────────────────────────────────
  readonly cancel = output<void>();
  readonly forceCreate = output<void>();

  // ── Private helpers ───────────────────────────────────────────────────────
  private readonly router = inject(Router);

  /** Tracks which case code was just copied (for visual feedback) */
  copiedCode = signal<string | null>(null);

  readonly baseUrl = environment.baseUrl;
  readonly filesBaseUrl = environment.filesBaseUrl;
  readonly placeholderImg = 'assets/images/no-photo-placeholder.png';

  // ── Computed state (drives the template declaratively) ────────────────────

  readonly isBlockedMode = computed(() => this.isBlocked());

  readonly popupIconContainerClass = computed(() => {
    if (this.readOnly()) {
      return 'bg-red-100 text-red-600 border border-red-200';
    }
    return 'bg-blue-100 text-blue-600 border border-blue-200';
  });

  readonly popupIcon = computed(() => {
    if (this.readOnly()) return 'block';
    return 'search';
  });

  readonly popupIconClass = computed(() =>
    this.readOnly() ? 'text-red-600' : 'text-blue-600'
  );

  readonly popupTitle = computed(() => {
    if (this.duplicateDecision() === DuplicateDecision.ActiveOwnerCase) {
      return 'تم العثور على بلاغ مطابق معتمد';
    }
    return 'تم رصد حالات مشابهة بالذكاء الاصطناعي';
  });

  readonly popupDescription = computed(() => {
    if (this.duplicateDecision() === DuplicateDecision.ActiveOwnerCase) {
      return 'يوجد بالفعل بلاغ مفقود معتمد ومطابق لهذا الشخص. لا يمكن إنشاء بلاغ إضافي للحفاظ على دقة البيانات.';
    }
    if (this.duplicateDecision() === DuplicateDecision.PendingUnknownCase) {
      return `يوجد ${this.matches().length} بلاغ مجهول الهوية مطابق وهو قيد المراجعة حالياً.`;
    }
    return `تم رصد ${this.matches().length} حالة مشابهة باستخدام تقنية التعرف على الوجه. يمكنك المتابعة إذا كنت متأكدًا أن هذه حالة جديدة مستقلة.`;
  });

  readonly cancelLabel = computed(() => {
    if (this.duplicateDecision() === DuplicateDecision.PendingUnknownCase) return 'انتظار';
    if (this.readOnly()) return 'إغلاق';
    return 'إلغاء';
  });

  readonly canForceCreate = computed(() => !this.readOnly());

  // ── Per-match helpers ─────────────────────────────────────────────────────

  getFullName(m: MatchedCaseResponse): string {
    return [m.fName, m.sName, m.tName, m.lName].filter(Boolean).join(' ') || 'غير معروف';
  }


  formatSimilarity(m: MatchedCaseResponse): number {
    const score = m.matchScore ?? (m as any).similarity ?? 0;
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

  /**
   * Copy case code to clipboard and show brief toast confirmation.
   * Stops click propagation so it does not trigger the card click.
   */
  copyCode(event: Event, code: string): void {
    event.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode.set(code);
      setTimeout(() => this.copiedCode.set(null), 2000);
    }).catch(() => {
      // silent — user can copy manually from the chip
    });
  }
}