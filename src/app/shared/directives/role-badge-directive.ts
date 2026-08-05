import { Directive, ElementRef, effect, input, Renderer2 } from '@angular/core';
import { UserRole } from '../enums/user-role';
import {
  ROLE_TRANSLATIONS_AR,
  getRoleTranslationAr,
} from '../../core/constants/dictionaries/roles.dictionary';

@Directive({
  selector: '[appRoleBadgeDirective]',
})
export class RoleBadgeDirective {
  role = input.required<string>({ alias: 'appRoleBadgeDirective' });

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
  ) {
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

      if (roleValue === UserRole.SuperAdmin) {
        this.renderer.addClass(el, 'bg-error');
        this.renderer.addClass(el, 'text-white');
      } else if (roleValue === UserRole.Admin) {
        this.renderer.addClass(el, 'bg-primary');
        this.renderer.addClass(el, 'text-on-primary');
      } else if (roleValue === UserRole.Moderator) {
        this.renderer.addClass(el, 'bg-secondary-container');
        this.renderer.addClass(el, 'text-on-secondary-container');
      } else if (roleValue === UserRole.VerifiedUser) {
        this.renderer.addClass(el, 'bg-tertiary-fixed-dim');
        this.renderer.addClass(el, 'text-tertiary');
      } else if (roleValue === UserRole.User) {
        this.renderer.addClass(el, 'bg-surface-variant');
        this.renderer.addClass(el, 'text-on-surface-variant');
      } else {
        // Any new future role (e.g. Organization)
        this.renderer.addClass(el, 'bg-indigo-600');
        this.renderer.addClass(el, 'text-white');
        this.renderer.addClass(el, 'border');
        this.renderer.addClass(el, 'border-indigo-400');
      }

      const translatedRole = getRoleTranslationAr(roleValue);
      el.innerText = translatedRole || this.role() || 'مستخدم غير موثق';
    });
  }
}
