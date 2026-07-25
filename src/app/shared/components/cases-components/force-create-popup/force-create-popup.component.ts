import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatchedCaseDto, mapCaseTypeToCardType } from '../../../models/responses/matched-case.model';
import { getCaseTypeTranslationAr } from '../../../../core/constants/case.type.dictionary';
import { environment } from '../../../../../environments/environment';

/**
 * <app-force-create-popup>
 * نسخة محسنة تركز على عرض الصورة بحجم أكبر وأوضح لمساعدة المستخدم في التحقق من المطابقة.
 * تدعم الآن خاصية منع التكرار (isBlocked) عند تطابق نفس نوع الحالة.
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
          <div class="header-icon-title">
            <span class="material-symbols-outlined" [class.warn-icon]="!isBlocked" [class.danger-icon]="isBlocked">
              {{ isBlocked ? 'block' : 'group_match' }}
            </span>
            <h2 class="title">
              {{ isBlocked ? 'حالة مكررة بالفعل!' : 'احتمالية وجود حالات مشابهة' }}
            </h2>
          </div>
          
          <!-- نص توضيحي ديناميكي حسب صلاحية الإنشاء -->
          <p class="subtitle" *ngIf="!isBlocked">
            لقد وجد النظام {{ matches.length }} حالة بنفس ملامح الوجه تقريبًا. 
            <strong>يرجى مراجعة الصور بدقة</strong> للتأكد ما إذا كان الشخص هو من تبحث عنه أم لا.
          </p>
          <p class="subtitle" *ngIf="isBlocked">
            تم العثور على حالة مطابقة تماماً مسجلة بالفعل <strong>من نفس النوع</strong>. 
            يمنع النظام تكرار نفس البلاغات لتجنب تشتيت جهود البحث. يمكنك التواصل مع مُبلغ الحالة الأصلي بالأسفل.
          </p>
        </div>

        <div class="modal-body">
          <div class="match-card" *ngFor="let m of matches; trackBy: trackByCode">
            <!-- مساحة الصورة الكبيرة -->
            <div class="photo-wrapper">
              <img 
                [src]="m.mainPhotoPath ? (baseUrl + '/' + m.mainPhotoPath) : placeholderImg" 
                class="match-photo" 
                [alt]="'صورة ' + m.fullName" 
              />
              <!-- عرض نسبة التطابق بشكل صحيح وآمن واقتصاص الكسور العشرية -->
              <div class="similarity-badge">
                {{ formatSimilarity(m) }}% تطابق
              </div>
            </div>

            <!-- تفاصيل الحالة بجانب الصورة -->
            <div class="match-content">
              <div class="match-main-info">
                <div class="match-name">{{ m.fullName }}</div>
                <div class="case-type-tag" [ngClass]="m.caseType">
                  {{ caseTypeLabel(m.caseType) }}
                </div>
              </div>
              
              <div class="match-details-grid">
                <div class="detail-item">
                  <span class="material-symbols-outlined">location_on</span>
                  {{ m.government }}
                </div>
                <div class="detail-item">
                  <span class="material-symbols-outlined">calendar_today</span>
                  العمر: {{ m.age }} سنوات
                </div>
                <div class="detail-item code-item">
                  <span class="material-symbols-outlined">qr_code</span>
                  كود: {{ m.caseCode }}
                </div>
              </div>

              <button class="btn-contact" (click)="onContact(m)">
                <span class="material-symbols-outlined">chat</span>
                تواصل مع المُبلّغ عن هذه الحالة
              </button>
            </div>
          </div>
        </div>

        <!-- أزرار التحكم السفلية -->
        <div class="modal-footer">
          <button class="btn-secondary" (click)="cancel.emit()">
            {{ isBlocked ? 'إغلاق نافذة البحث' : 'إلغاء' }}
          </button>
          
          <!-- يتم إخفاء زر التخطي وإنشاء بلاغ جديد كلياً إذا كان التطابق من نفس النوع مفعلاً -->
          <button *ngIf="!isBlocked" class="btn-primary" (click)="forceCreate.emit()">
            <span class="material-symbols-outlined">add_circle</span>
            تجاهل وإنشاء بلاغ جديد
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { --primary-color: #0058be; --text-main: #0b1c30; --text-sub: #56585e; --border-color: #e8eaf0; --bg-light: #f4f7fa; }

    /* Material Icons settings */
    .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; font-size: 20px; }

    .modal-backdrop { position: fixed; inset: 0; z-index: 1100; background: rgba(9,20,38,0.7);
      backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 16px; transition: all 0.3s; }
    
    .modal-box { background: #fff; border-radius: 24px; box-shadow: 0 30px 70px rgba(0,0,0,0.3);
      width: 100%; max-width: 720px; max-height: 90vh; overflow-y: auto; direction: rtl; display: flex; flex-direction: column; }
    
    .modal-header { padding: 28px 32px 20px; border-bottom: 1px solid var(--border-color); position: sticky; top: 0; background: #fff; z-index: 2; }
    .header-icon-title { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .warn-icon { color: #f59e0b; font-size: 32px; font-variation-settings: 'FILL' 1; }
    .danger-icon { color: #dc2626; font-size: 32px; font-variation-settings: 'FILL' 1; }
    .title { font-size: 22px; font-weight: 800; color: var(--text-main); margin: 0; }
    .subtitle { font-size: 14px; color: var(--text-sub); line-height: 1.7; margin: 0; }
    .subtitle strong { color: #d32f2f; font-weight: 700; }

    .modal-body { padding: 24px 32px; display: flex; flex-direction: column; gap: 20px; flex: 1; }
    
    /* تصميم الكارت الجديد - تركز على الصورة */
    .match-card { display: flex; gap: 20px; border: 1.5px solid var(--border-color);
      border-radius: 18px; padding: 16px; background: #fff; transition: all 0.3s ease; overflow: hidden; }
    .match-card:hover { border-color: var(--primary-color); box-shadow: 0 10px 20px rgba(0,88,190,0.08); background: #fafcff; }

    /* حاوي الصورة - تم تكبيره */
    .photo-wrapper { position: relative; width: 180px; height: 180px;
      border-radius: 14px; overflow: hidden; flex-shrink: 0; background: var(--bg-light); border: 1px solid var(--border-color); }
    
    .match-photo { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
    .match-card:hover .match-photo { transform: scale(1.08); }

    .similarity-badge { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0, 200, 81, 0.9);
      color: #fff; text-align: center; font-size: 12px; font-weight: 700; padding: 6px 4px; backdrop-filter: blur(2px); }

    /* قسم التفاصيل بجانب الصورة */
    .match-content { flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; }
    
    .match-main-info { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .match-name { font-size: 18px; font-weight: 800; color: var(--text-main); line-height: 1.3; }
    
    /* تاغات أنواع الحالات */
    .case-type-tag { padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; white-space: nowrap; }
    .case-type-tag.Missing { background: #fff3e0; color: #e65100; border: 1px solid #ffe0b2; }
    .case-type-tag.Found { background: #e8f5e9; color: #1b5e20; border: 1px solid #c8e6c9; }
    .case-type-tag.LongTerm { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }

    .match-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 15px; }
    .detail-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-sub); }
    .detail-item .material-symbols-outlined { font-size: 18px; color: #a0a4ab; }
    .code-item { grid-column: 1 / -1; color: var(--primary-color); font-weight: 600; background: var(--bg-light); padding: 4px 8px; border-radius: 6px; width: fit-content; }

    .btn-contact { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 12px;
      border: 1.5px solid var(--primary-color); color: var(--primary-color); background: transparent; font-size: 14px; font-weight: 700;
      cursor: pointer; width: 100%; transition: all 0.2s; margin-top: auto; }
    .btn-contact:hover { background: var(--primary-color); color: #fff; box-shadow: 0 4px 12px rgba(0,88,190,0.2); }

    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 20px 32px 24px;
      border-top: 1px solid var(--border-color); position: sticky; bottom: 0; background: #fff; z-index: 2; }
    .btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 14px;
      background: var(--primary-color); color: #fff; font-size: 15px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; }
    .btn-primary:hover { background: #004494; transform: translateY(-1px); box-shadow: 0 5px 15px rgba(0,88,190,0.3); }
    .btn-secondary { padding: 12px 20px; border-radius: 14px; background: transparent; color: var(--text-sub);
      font-size: 15px; font-weight: 600; border: 1.5px solid #dde1ee; cursor: pointer; transition: all 0.2s; }
    .btn-secondary:hover { background: #f4f5f8; border-color: #d1d5db; color: var(--text-main); }
  `],
})
export class ForceCreatePopupComponent {
  @Input({ required: true }) matches: MatchedCaseDto[] = [];
  @Input() isBlocked = false; // لمنع الحالات مكررة النوع
  @Output() cancel = new EventEmitter<void>();
  @Output() forceCreate = new EventEmitter<void>();

  private readonly router = inject(Router);
  
  readonly baseUrl = environment.baseUrl;
  readonly placeholderImg = 'assets/images/no-photo-placeholder.png'; 

  caseTypeLabel(type: MatchedCaseDto['caseType']): string {
    return getCaseTypeTranslationAr(type);
  }

  trackByCode(_: number, m: MatchedCaseDto): string {
    return m.caseCode;
  }

  /**
   * ميثود مرنة لضمان قراءة الـ similarity بشكل صحيح من الـ API 
   * سواء كانت مكتوبة بحرف كبير أو صغير في الـ JSON المُستلم
   */
  formatSimilarity(m: any): number {
    const rawVal = m.similarity !== undefined ? m.similarity : m.Similarity;
    if (rawVal === undefined || rawVal === null) return 0;
    
    // تحويل النسبة لمئوية صحيحة مقربة إذا كانت بصيغة كسرية (0.92 -> 92) أو رقم مباشر
    const numVal = Number(rawVal);
    const resolvedValue = numVal <= 1 ? numVal * 100 : numVal;
    return Math.round(resolvedValue);
  }

onContact(m: MatchedCaseDto): void {
  this.router.navigate(['/chat/start', m.id]);
}
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement) === event.currentTarget) this.cancel.emit();
  }
}