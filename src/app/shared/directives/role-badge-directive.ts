import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appRoleBadgeDirective]'})
export class RoleBadgeDirective implements OnChanges {
  @Input('appRoleBadgeDirective') role!: string;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.addClass(this.el.nativeElement, 'px-sm');
    this.renderer.addClass(this.el.nativeElement, 'py-1');
    this.renderer.addClass(this.el.nativeElement, 'rounded-lg');
    this.renderer.addClass(this.el.nativeElement, 'text-[10px]');
    this.renderer.addClass(this.el.nativeElement, 'font-bold');
  }

  ngOnChanges() {
    const el = this.el.nativeElement;
    el.className = el.className.replace(/\bbg-\S+|text-\S+/g, '');
    
    if (this.role === 'Admin') {
      this.renderer.addClass(el, 'bg-error');
      this.renderer.addClass(el, 'text-white');
      el.innerText = 'مدير النظام';
    } else if (this.role === 'Moderator') {
      this.renderer.addClass(el, 'bg-secondary-fixed');
      this.renderer.addClass(el, 'text-on-secondary-fixed');
      el.innerText = 'مشرف';
    } else if (this.role === 'VerifiedUser') {
      this.renderer.addClass(el, 'bg-tertiary-fixed-dim');
      this.renderer.addClass(el, 'text-tertiary');
      el.innerText = 'مستخدم موثق';
    } else {
      this.renderer.addClass(el, 'bg-surface-container-highest');
      this.renderer.addClass(el, 'text-on-surface-variant');
      el.innerText = 'مستخدم عادي';
    }
  }
}