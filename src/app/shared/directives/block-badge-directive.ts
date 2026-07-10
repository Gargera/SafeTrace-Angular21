import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appBlockBadgeDirective]'})
export class BlockBadgeDirective implements OnChanges {
  @Input('appBlockBadgeDirective') isBlocked!: boolean;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.addClass(this.el.nativeElement, 'px-sm');
    this.renderer.addClass(this.el.nativeElement, 'py-1');
    this.renderer.addClass(this.el.nativeElement, 'rounded-full');
    this.renderer.addClass(this.el.nativeElement, 'text-[10px]');
    this.renderer.addClass(this.el.nativeElement, 'font-bold');
  }

  ngOnChanges() {
    const el = this.el.nativeElement;
    el.className = el.className.replace(/\bbg-\S+|text-\S+/g, '');
    
    if (this.isBlocked) {
      this.renderer.addClass(el, 'bg-error');
      this.renderer.addClass(el, 'text-white');
      el.innerText = 'نعم (محظور)';
    } else {
      this.renderer.addClass(el, 'bg-surface-container-highest');
      this.renderer.addClass(el, 'text-on-surface-variant');
      el.innerText = 'لا (نشط)';
    }
  }
}