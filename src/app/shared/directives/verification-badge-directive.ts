import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';
import { VerificationStatus } from '../enums/verification-status';
import { getVerificationStatusTranslationAr } from '../../core/constants/verification.status.dictionary';

@Directive({
  selector: '[appVerificationBadgeDirective]'
})
export class VerificationBadgeDirective implements OnChanges {
  @Input('appVerificationBadgeDirective') status!: VerificationStatus;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.addClass(this.el.nativeElement, 'inline-flex');
    this.renderer.addClass(this.el.nativeElement, 'items-center');
    this.renderer.addClass(this.el.nativeElement, 'gap-xs');
    this.renderer.addClass(this.el.nativeElement, 'px-sm');
    this.renderer.addClass(this.el.nativeElement, 'py-1');
    this.renderer.addClass(this.el.nativeElement, 'rounded-full');
    this.renderer.addClass(this.el.nativeElement, 'font-bold');
    this.renderer.addClass(this.el.nativeElement, 'text-[10px]');
  }

  ngOnChanges() {
    const el = this.el.nativeElement;
    el.className = el.className.replace(/\bbg-\S+|text-\S+/g, '');

    if (this.status === VerificationStatus.Verified) {
      this.renderer.addClass(el, 'bg-tertiary-fixed');
      this.renderer.addClass(el, 'text-on-tertiary-fixed');
    } else if (this.status === VerificationStatus.Pending) {
      this.renderer.addClass(el, 'bg-secondary-container');
      this.renderer.addClass(el, 'text-white');
    } else {
      this.renderer.addClass(el, 'bg-error-container');
      this.renderer.addClass(el, 'text-on-error-container');
    }

    const translation = getVerificationStatusTranslationAr(this.status) || 'غير موثق';
    el.innerHTML = `<span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1">${this.getIcon()}</span> ${translation}`;
  }

  private getIcon(): string {
    switch (this.status) {
      case VerificationStatus.Verified:
        return 'verified';
      case VerificationStatus.Pending:
        return 'pending';
      default:
        return 'error';
    }
  }
}