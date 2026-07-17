import { Component, Input, Output, EventEmitter, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

/**
 * <app-founded-popup>
 * بتفتح لما يتم تسجيل حالة (LongTerm/Unknown/Urgent) كـ "تم العثور عليه"
 * (MarkAsFound/{id} endpoint، بياخد FoundPersonInfoRequestDto).
 *
 * ⚠️ حقول الفورم دي مبدئية (foundLocation/foundDate/notes) بناءً على اسم الـ DTO بس -
 * المفروض تتأكدي من الحقول الفعلية اللي الباك عندها في FoundPersonInfoRequestDto
 * قبل ما تربطيها نهائيًا، وتعدّلي الفورم لو الأسماء مختلفة.
 *
 * الكومبوننت ده بيبعت الداتا للأب بس (confirmed) - نداء الـ API الفعلي (service.markAsFound)
 * بيتم في الأب اللي عنده الـ service المناسب لنوع الحالة.
 */
@Component({
  selector: 'app-founded-popup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-box" (click)="$event.stopPropagation()">

        <div class="modal-header">
          <h2 class="title">تسجيل الحالة كـ "تم العثور عليه"</h2>
          <button class="close-btn" type="button" (click)="cancel.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form [formGroup]="form" class="modal-body" (ngSubmit)="onSubmit()">
          <div class="field-group">
            <label class="field-label">مكان العثور عليه <span class="req">*</span></label>
            <input formControlName="foundLocation" type="text" class="field"
                   [class.error]="isInvalid('foundLocation')" />
            <p class="err-msg" *ngIf="isInvalid('foundLocation')">مطلوب</p>
          </div>

          <div class="field-group">
            <label class="field-label">تاريخ العثور عليه <span class="req">*</span></label>
            <input formControlName="foundDate" type="date" class="field"
                   [class.error]="isInvalid('foundDate')" />
            <p class="err-msg" *ngIf="isInvalid('foundDate')">مطلوب</p>
          </div>

          <div class="field-group">
            <label class="field-label">ملاحظات</label>
            <textarea formControlName="notes" rows="3" class="field"></textarea>
          </div>

          <div class="alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        </form>

        <div class="modal-footer">
          <button class="btn-secondary" type="button" (click)="cancel.emit()">إلغاء</button>
          <button class="btn-primary" type="button" [disabled]="isSubmitting()" (click)="onSubmit()">
            {{ isSubmitting() ? 'جاري الحفظ...' : 'تأكيد' }}
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop { position: fixed; inset: 0; z-index: 1100; background: rgba(9,20,38,0.6);
      backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-box { background: #fff; border-radius: 20px; width: 100%; max-width: 480px; direction: rtl; }
    .modal-header { display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; border-bottom: 1px solid #e8eaf0; }
    .title { font-size: 17px; font-weight: 700; margin: 0; color: #0b1c30; }
    .close-btn { background: #f4f6fb; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; }
    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
    .field-group { display: flex; flex-direction: column; gap: 5px; }
    .field-label { font-size: 13px; font-weight: 600; color: #1a2540; }
    .field-label .req { color: #ba1a1a; }
    .field { padding: 10px 12px; border: 1.5px solid #dde1ee; border-radius: 10px; font-size: 14px; box-sizing: border-box; width: 100%; }
    .field.error { border-color: #ba1a1a; }
    .err-msg { font-size: 12px; color: #ba1a1a; }
    .alert-error { background: #ffdad6; color: #93000a; padding: 10px 14px; border-radius: 10px; font-size: 13px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #e8eaf0; }
    .btn-primary { background: #0058be; color: #fff; border: none; padding: 10px 20px; border-radius: 12px; cursor: pointer; font-weight: 600; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: transparent; border: 1.5px solid #dde1ee; padding: 10px 18px; border-radius: 12px; cursor: pointer; font-weight: 600; }
  `],
})
export class FoundedPopupComponent {
  @Input({ required: true }) caseId!: number;
  @Output() cancel = new EventEmitter<void>();
  // TODO: بدّليها بـ FoundPersonInfoRequestDto الحقيقي لما تتأكدي من شكله بالظبط
  @Output() confirmed = new EventEmitter<{ foundLocation: string; foundDate: string; notes: string | null }>();

  private readonly fb = inject(FormBuilder);
  isSubmitting = signal(false);
  errorMsg = signal<string | null>(null);

  form = this.fb.group({
    foundLocation: ['', Validators.required],
    foundDate: ['', Validators.required],
    notes: [''],
  });

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirmed.emit(this.form.getRawValue() as any);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement) === event.currentTarget) this.cancel.emit();
  }
}