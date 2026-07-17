import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatchedCaseDto, mapCaseTypeToCardType } from '../../../models/responses/matched-case.model';
import { getCaseTypeTranslationAr } from '../../../../core/constants/case.type.dictionary';

/**
 * <app-force-create-popup>
 * بتفتح لما CreateCase يرجع IsCreated=false مع MatchedCases (تطابق cross-type بالوش).
 * ⚠️ ده مش error، الـ response بيرجع 200 عادي - الفرونت لازم يعاملها كـ "تأكيد مطلوب".
 *
 * بتدي اليوزر خيارين:
 * 1) يتواصل مع صاحب أي حالة متطابقة (زرار لكل match).
 * 2) يتجاهل التطابقات ويكمل الإنشاء -> بيتنادى (forceCreate) والأب هو اللي يعيد
 *    إرسال نفس الـ FormData تاني مع `?forceCreate=true`.
 */
@Component({
  selector: 'app-force-create-popup',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-box" (click)="$event.stopPropagation()">

        <div class="modal-header">
          <h2 class="title">فيه حالات مشابهة موجودة بالفعل</h2>
          <p class="subtitle">
            النظام لقى {{ matches.length }} حالة تانية بنفس ملامح الوجه تقريبًا، من نوع مختلف
            عن اللي بتبلّغ عنه دلوقتي. تقدر تتواصل مع صاحب البلاغ، أو تتجاهل وتكمل إنشاء بلاغك.
          </p>
        </div>

        <div class="modal-body">
          <div class="match-card" *ngFor="let m of matches; trackBy: trackByCode">
            <img [src]="m.mainPhotoPath ?? placeholderImg" class="match-photo" alt="" />
            <div class="match-info">
              <div class="match-name">{{ m.fullName }}</div>
              <div class="match-meta">{{ caseTypeLabel(m.caseType) }} · تشابه {{ m.similarity }}%</div>
              <div class="match-meta">{{ m.government }} · العمر {{ m.age }}</div>
              <div class="match-code">كود الحالة: {{ m.caseCode }}</div>
            </div>
            <button class="btn-contact" (click)="onContact(m)">
              <span class="material-symbols-outlined" style="font-size:18px;">chat</span>
              تواصل مع المُبلّغ
            </button>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" (click)="cancel.emit()">إلغاء</button>
          <button class="btn-primary" (click)="forceCreate.emit()">
            <span class="material-symbols-outlined" style="font-size:18px;">check_circle</span>
            تجاهل وأكمل إنشاء البلاغ
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop { position: fixed; inset: 0; z-index: 1100; background: rgba(9,20,38,0.6);
      backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-box { background: #fff; border-radius: 20px; box-shadow: 0 25px 60px rgba(0,0,0,0.25);
      width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; direction: rtl; }
    .modal-header { padding: 24px 28px 16px; border-bottom: 1px solid #e8eaf0; }
    .title { font-size: 19px; font-weight: 700; color: #0b1c30; margin: 0 0 8px; }
    .subtitle { font-size: 13px; color: #75777d; line-height: 1.6; margin: 0; }
    .modal-body { padding: 20px 28px; display: flex; flex-direction: column; gap: 14px; }
    .match-card { display: flex; align-items: center; gap: 14px; border: 1.5px solid #e8eaf0;
      border-radius: 14px; padding: 12px; }
    .match-photo { width: 60px; height: 60px; border-radius: 10px; object-fit: cover; background: #f0f2f8; flex-shrink: 0; }
    .match-info { flex: 1; }
    .match-name { font-size: 14px; font-weight: 700; color: #0b1c30; }
    .match-meta { font-size: 12px; color: #75777d; margin-top: 2px; }
    .match-code { font-size: 11px; color: #0058be; margin-top: 4px; font-weight: 600; }
    .btn-contact { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px;
      border: 1.5px solid #0058be; color: #0058be; background: transparent; font-size: 12px; font-weight: 600;
      cursor: pointer; flex-shrink: 0; }
    .btn-contact:hover { background: #f0f5ff; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 28px;
      border-top: 1px solid #e8eaf0; position: sticky; bottom: 0; background: #fff; }
    .btn-primary { display: flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 12px;
      background: #0058be; color: #fff; font-size: 14px; font-weight: 600; border: none; cursor: pointer; }
    .btn-secondary { padding: 10px 18px; border-radius: 12px; background: transparent; color: #45474c;
      font-size: 14px; font-weight: 600; border: 1.5px solid #dde1ee; cursor: pointer; }
  `],
})
export class ForceCreatePopupComponent {
  @Input({ required: true }) matches: MatchedCaseDto[] = [];

  /** اليوزر قفل الـ popup من غير قرار (زي backdrop/إلغاء) */
  @Output() cancel = new EventEmitter<void>();
  /** اليوزر اختار يتجاهل التطابقات - الأب يعيد submit مع forceCreate=true */
  @Output() forceCreate = new EventEmitter<void>();

  private readonly router = inject(Router);
  // TODO: استبدلها بمسار صورة placeholder فعلية موجودة عندكم في assets
  readonly placeholderImg = 'assets/images/no-photo.png';

  caseTypeLabel(type: MatchedCaseDto['caseType']): string {
    return getCaseTypeTranslationAr(type);
  }

  trackByCode(_: number, m: MatchedCaseDto): string {
    return m.caseCode;
  }

  onContact(m: MatchedCaseDto): void {
    this.router.navigate(['/chat'], {
      queryParams: {
        caseId: m.id,
        caseType: mapCaseTypeToCardType(m.caseType),
        reporterId: m.userId,
      },
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement) === event.currentTarget) this.cancel.emit();
  }
}