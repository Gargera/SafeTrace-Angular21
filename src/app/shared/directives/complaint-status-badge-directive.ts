import { Directive, ElementRef, Input, OnChanges } from '@angular/core';
import { ComplaintStatus } from '../enums/complaint-status';
import { BadgeRenderService } from '../services/badge-render.service';

@Directive({
  selector: '[appComplaintStatusBadge]',
  standalone: true
})
export class ComplaintStatusBadgeDirective implements OnChanges {
  @Input('appComplaintStatusBadge') status!: ComplaintStatus | string | null;
  private readonly baseClasses = ['inline-flex', 'items-center', 'gap-xs', 'px-sm', 'py-1', 'rounded-lg', 'text-sm', 'font-bold', 'whitespace-nowrap'];

  constructor(
    private el: ElementRef,
    private badgeRenderService: BadgeRenderService
  ) {}

  ngOnChanges() {
    if (!this.status) return;
    this.badgeRenderService.updateBadge(this.el.nativeElement, this.status as ComplaintStatus, {
      baseClasses: this.baseClasses,
      getClasses: (val: ComplaintStatus) => {
        if (val === ComplaintStatus.Solved) return { bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed' };
        if (val === ComplaintStatus.UnSolved) return { bg: 'bg-error-container', text: 'text-error' };
        return { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' };
      },
      getContent: (val: ComplaintStatus) => {
        let translation = 'غير معروف';
        let icon = 'help';
        if (val === ComplaintStatus.Solved) { translation = 'تم الحل'; icon = 'task_alt'; }
        else if (val === ComplaintStatus.UnSolved) { translation = 'لم يتم الحل'; icon = 'error'; }
        return `<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1">${icon}</span> ${translation}`;
      },
      useTextOnly: false
    });
  }
}
