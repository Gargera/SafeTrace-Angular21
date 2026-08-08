import { Directive, ElementRef, Input, OnChanges } from '@angular/core';
import { PaymentStatus } from '../enums/payment-status.enum';
import { BadgeRenderService } from '../services/badge-render.service';

@Directive({
  selector: '[appPaymentStatusBadge]',
  standalone: true
})
export class PaymentStatusBadgeDirective implements OnChanges {
  @Input('appPaymentStatusBadge') status!: PaymentStatus | string | null;
  private readonly baseClasses = ['inline-flex', 'items-center', 'justify-center', 'gap-1.5', 'px-3', 'py-1', 'rounded-lg', 'text-sm', 'font-bold', 'whitespace-nowrap'];

  constructor(
    private el: ElementRef,
    private badgeRenderService: BadgeRenderService
  ) {}

  ngOnChanges(): void {
    if (!this.status) return;
    this.badgeRenderService.updateBadge(this.el.nativeElement, this.status as PaymentStatus, {
      baseClasses: this.baseClasses,
      getClasses: (val: PaymentStatus) => {
        if (val === PaymentStatus.Succeeded) return { bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed' };
        if (val === PaymentStatus.Pending) return { bg: 'bg-secondary-container', text: 'text-on-secondary-container' };
        if (val === PaymentStatus.Failed) return { bg: 'bg-error-container', text: 'text-error' };
        if (val === PaymentStatus.Cancelled) return { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' };
        if (val === PaymentStatus.Refunded) return { bg: 'bg-secondary-fixed', text: 'text-on-secondary-fixed' };
        return { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' };
      },
      getContent: (val: PaymentStatus) => {
        let translation = 'غير معروف';
        let icon = 'help';
        if (val === PaymentStatus.Succeeded) { translation = 'ناجح'; icon = 'check_circle'; }
        else if (val === PaymentStatus.Pending) { translation = 'قيد الانتظار'; icon = 'hourglass_empty'; }
        else if (val === PaymentStatus.Failed) { translation = 'فشل'; icon = 'cancel'; }
        else if (val === PaymentStatus.Cancelled) { translation = 'ملغي'; icon = 'block'; }
        else if (val === PaymentStatus.Refunded) { translation = 'مسترد'; icon = 'undo'; }
        return `<span class="material-symbols-outlined text-[16px] leading-none shrink-0" style="font-variation-settings: 'FILL' 1">${icon}</span><span>${translation}</span>`;
      },
      useTextOnly: false
    });
  }
}
