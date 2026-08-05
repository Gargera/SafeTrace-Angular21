import { Directive, ElementRef, effect, input, Renderer2 } from '@angular/core';
import { VerificationStatus } from '../enums/verification-status';
import { getVerificationStatusTranslationAr } from '../../core/constants/dictionaries/verification.status.dictionary';

@Directive({
  selector: '[appVerificationBadgeDirective]'
})
export class VerificationBadgeDirective {
  status = input.required<VerificationStatus>({ alias: 'appVerificationBadgeDirective' });

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.addClass(this.el.nativeElement, 'inline-flex');
    this.renderer.addClass(this.el.nativeElement, 'items-center');
    this.renderer.addClass(this.el.nativeElement, 'gap-xs');
    this.renderer.addClass(this.el.nativeElement, 'px-sm');
    this.renderer.addClass(this.el.nativeElement, 'py-1');
    this.renderer.addClass(this.el.nativeElement, 'rounded-lg');
    this.renderer.addClass(this.el.nativeElement, 'text-[10px]');
    this.renderer.addClass(this.el.nativeElement, 'font-bold');
    this.renderer.addClass(this.el.nativeElement, 'whitespace-nowrap');
    effect(() => {
      const el = this.el.nativeElement;
      el.className = el.className.replace(/\bbg-\S+|text-\S+/g, '');

      if (this.status() === VerificationStatus.Verified) {
        this.renderer.addClass(el, 'bg-tertiary-fixed');
        this.renderer.addClass(el, 'text-on-tertiary-fixed');
      } else if (this.status() === VerificationStatus.Pending) {
        this.renderer.addClass(el, 'bg-secondary-container');
        this.renderer.addClass(el, 'text-white');
      } else {
        this.renderer.addClass(el, 'bg-error-container');
        this.renderer.addClass(el, 'text-on-error-container');
      }

      const translation = getVerificationStatusTranslationAr(this.status()) || 'غير موثق';
      el.innerHTML = `<span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1">${this.getIcon()}</span> ${translation}`;
    });
  }

  private getIcon(): string {
    switch (this.status()) {
      case VerificationStatus.Verified:
        return 'verified';
      case VerificationStatus.Pending:
        return 'pending';
      default:
        return 'error';
    }
  }
}