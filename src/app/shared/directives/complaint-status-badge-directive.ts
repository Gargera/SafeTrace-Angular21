import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';
import { ComplaintStatus } from '../enums/complaint-status';

@Directive({
  selector: '[appComplaintStatusBadge]',
  standalone: true
})
export class ComplaintStatusBadgeDirective implements OnChanges {
  @Input('appComplaintStatusBadge') status!: ComplaintStatus | string | null;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges() {
    this.updateBadge();
  }

  private updateBadge() {
    const el = this.el.nativeElement;
    
    // Base classes
    this.renderer.addClass(el, 'px-3');
    this.renderer.addClass(el, 'py-1');
    this.renderer.addClass(el, 'rounded-full');
    this.renderer.addClass(el, 'text-sm');
    this.renderer.addClass(el, 'font-medium');
    this.renderer.addClass(el, 'inline-block');

    this.renderer.removeClass(el, 'bg-green-100');
    this.renderer.removeClass(el, 'text-green-800');
    this.renderer.removeClass(el, 'bg-red-100');
    this.renderer.removeClass(el, 'text-red-800');
    this.renderer.removeClass(el, 'bg-gray-100');
    this.renderer.removeClass(el, 'text-gray-800');

    if (this.status === ComplaintStatus.Solved) {
      this.renderer.addClass(el, 'bg-green-100');
      this.renderer.addClass(el, 'text-green-800');
    } else if (this.status === ComplaintStatus.UnSolved) {
      this.renderer.addClass(el, 'bg-red-100');
      this.renderer.addClass(el, 'text-red-800');
    } else {
      this.renderer.addClass(el, 'bg-gray-100');
      this.renderer.addClass(el, 'text-gray-800');
    }
  }
}
