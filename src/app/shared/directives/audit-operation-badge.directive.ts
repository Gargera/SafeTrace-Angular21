import { Directive, ElementRef, effect, input, Renderer2 } from '@angular/core';
import { getAuditOperationTranslationAr } from '../../core/constants/audit.operation.dictionary';

@Directive({
  selector: '[appAuditOperationBadge]',
  standalone: true
})
export class AuditOperationBadgeDirective {
  operation = input.required<string>({ alias: 'appAuditOperationBadge' });

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

      const opValue = this.operation();
      let icon = 'help';

      if (opValue === 'Insert') {
        this.renderer.addClass(el, 'bg-tertiary-fixed');
        this.renderer.addClass(el, 'text-on-tertiary-fixed');
        icon = 'add_circle';
      } else if (opValue === 'Update') {
        this.renderer.addClass(el, 'bg-secondary-fixed');
        this.renderer.addClass(el, 'text-on-secondary-fixed');
        icon = 'edit';
      } else if (opValue === 'Delete') {
        this.renderer.addClass(el, 'bg-error-container');
        this.renderer.addClass(el, 'text-error');
        icon = 'delete';
      } else {
        this.renderer.addClass(el, 'bg-surface-container-highest');
        this.renderer.addClass(el, 'text-on-surface-variant');
      }

      const translation = getAuditOperationTranslationAr(opValue);
      el.innerHTML = `<span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1">${icon}</span> ${translation}`;
    });
  }
}
