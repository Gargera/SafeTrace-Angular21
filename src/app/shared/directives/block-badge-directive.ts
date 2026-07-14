import { Directive, ElementRef, effect, input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appBlockBadgeDirective]'})
export class BlockBadgeDirective {
  isBlocked = input.required<boolean>({ alias: 'appBlockBadgeDirective' });

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.addClass(this.el.nativeElement, 'px-sm');
    this.renderer.addClass(this.el.nativeElement, 'py-1');
    this.renderer.addClass(this.el.nativeElement, 'rounded-lg');
    this.renderer.addClass(this.el.nativeElement, 'text-[10px]');
    this.renderer.addClass(this.el.nativeElement, 'font-bold');
    this.renderer.addClass(this.el.nativeElement, 'whitespace-nowrap');
    effect(() => {
      const el = this.el.nativeElement;
      el.className = el.className.replace(/\bbg-\S+|text-\S+/g, '');
      
      if (this.isBlocked()) {
        this.renderer.addClass(el, 'bg-error');
        this.renderer.addClass(el, 'text-white');
        el.innerText = 'محظور';
      } else {
        this.renderer.addClass(el, 'bg-surface-container-highest');
        this.renderer.addClass(el, 'text-on-surface-variant');
        el.innerText = 'نشط';
      }
    });
  }
}