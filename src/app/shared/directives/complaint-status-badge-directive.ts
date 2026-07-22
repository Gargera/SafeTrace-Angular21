import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';
import { ComplaintStatus } from '../enums/complaint-status';

@Directive({
  selector: '[appComplaintStatusBadge]',
  standalone: true
})
export class ComplaintStatusBadgeDirective implements OnChanges {
  @Input('appComplaintStatusBadge') status!: ComplaintStatus | string | null;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.addClass(this.el.nativeElement, 'px-sm');
    this.renderer.addClass(this.el.nativeElement, 'py-1');
    this.renderer.addClass(this.el.nativeElement, 'rounded-full');
    this.renderer.addClass(this.el.nativeElement, 'font-bold');
    this.renderer.addClass(this.el.nativeElement, 'text-[10px]');
    this.renderer.addClass(this.el.nativeElement, 'whitespace-nowrap');
  }

  ngOnChanges() {
    this.updateBadge();
  }

  private updateBadge() {
    const el = this.el.nativeElement;
    
    el.className = el.className.replace(/\bbg-\S+|text-\S+/g, '');

    let label = 'غير معروف';

    if (this.status === ComplaintStatus.Solved) {
      this.renderer.addClass(el, 'bg-tertiary-fixed');
      this.renderer.addClass(el, 'text-on-tertiary-fixed');
      label = 'تم الحل';
    } else if (this.status === ComplaintStatus.UnSolved) {
      this.renderer.addClass(el, 'bg-error-container');
      this.renderer.addClass(el, 'text-error');
      label = 'لم يتم الحل';
    } else {
      this.renderer.addClass(el, 'bg-surface-container-highest');
      this.renderer.addClass(el, 'text-on-surface-variant');
    }
    
    el.innerText = label;
  }
}
