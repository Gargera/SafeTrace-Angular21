import { Directive, ElementRef, effect, input, Renderer2 } from '@angular/core';
import { UserRole } from '../enums/user-role';
import { ROLE_TRANSLATIONS_AR, getRoleTranslationAr } from '../../core/constants/roles.dictionary';

@Directive({
  selector: '[appRoleBadgeDirective]'
})
export class RoleBadgeDirective {
  role = input.required<string>({ alias: 'appRoleBadgeDirective' });

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

      const roleValue = this.role() as UserRole;

      if (roleValue === UserRole.Admin) {
        this.renderer.addClass(el, 'bg-error');
        this.renderer.addClass(el, 'text-white');
      } else if (roleValue === UserRole.Moderator) {
        this.renderer.addClass(el, 'bg-secondary-fixed');
        this.renderer.addClass(el, 'text-on-secondary-fixed');
      } else if (roleValue === UserRole.VerifiedUser) {
        this.renderer.addClass(el, 'bg-tertiary-fixed-dim');
        this.renderer.addClass(el, 'text-tertiary');
      } else {
        this.renderer.addClass(el, 'bg-surface-container-highest');
        this.renderer.addClass(el, 'text-on-surface-variant');
      }

      const translatedRole = getRoleTranslationAr(roleValue);
      el.innerText = translatedRole || ROLE_TRANSLATIONS_AR[UserRole.User] || this.role();
    });
  }
}