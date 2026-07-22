import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';
import { PaymentStatus } from '../enums/payment-status.enum';

@Directive({
  selector: '[appPaymentStatusBadge]',
  standalone: true
})
export class PaymentStatusBadgeDirective implements OnChanges {
  @Input('appPaymentStatusBadge') status!: PaymentStatus | string | null;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.addClass(this.el.nativeElement, 'px-sm');
    this.renderer.addClass(this.el.nativeElement, 'py-1');
    this.renderer.addClass(this.el.nativeElement, 'rounded-full');
    this.renderer.addClass(this.el.nativeElement, 'font-bold');
    this.renderer.addClass(this.el.nativeElement, 'text-[10px]');
    this.renderer.addClass(this.el.nativeElement, 'whitespace-nowrap');
  }

  ngOnChanges(): void {
    if (!this.status) return;

    const el = this.el.nativeElement;
    
    el.className = el.className.replace(/\bbg-\S+|text-\S+/g, '');

    let label = 'غير معروف';

    if (this.status === PaymentStatus.Succeeded) {
      this.renderer.addClass(el, 'bg-tertiary-fixed');
      this.renderer.addClass(el, 'text-on-tertiary-fixed');
      label = 'ناجح';
    } else if (this.status === PaymentStatus.Pending) {
      this.renderer.addClass(el, 'bg-secondary-container');
      this.renderer.addClass(el, 'text-on-secondary-container');
      label = 'قيد الانتظار';
    } else if (this.status === PaymentStatus.Failed) {
      this.renderer.addClass(el, 'bg-error-container');
      this.renderer.addClass(el, 'text-error');
      label = 'فشل';
    } else if (this.status === PaymentStatus.Cancelled) {
      this.renderer.addClass(el, 'bg-surface-container-highest');
      this.renderer.addClass(el, 'text-on-surface-variant');
      label = 'ملغي';
    } else if (this.status === PaymentStatus.Refunded) {
      this.renderer.addClass(el, 'bg-secondary-fixed');
      this.renderer.addClass(el, 'text-on-secondary-fixed');
      label = 'مسترد';
    } else {
      this.renderer.addClass(el, 'bg-surface-container-highest');
      this.renderer.addClass(el, 'text-on-surface-variant');
    }

    el.innerText = label;
  }
}
