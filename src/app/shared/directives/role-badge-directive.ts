import { Directive, ElementRef, effect, input } from '@angular/core';
import { UserRole } from '../enums/user-role';
import { getRoleTranslationAr } from '../../core/constants/dictionaries/roles.dictionary';
import { BadgeRenderService } from '../services/badge-render.service';

@Directive({
  selector: '[appRoleBadgeDirective]',
})
export class RoleBadgeDirective {
  role = input.required<string>({ alias: 'appRoleBadgeDirective' });

  private readonly baseClasses = [
    'px-sm',
    'py-1',
    'rounded-lg',
    'text-[10px]',
    'font-bold',
    'whitespace-nowrap',
  ];

  constructor(
    private el: ElementRef,
    private badgeService: BadgeRenderService,
  ) {
    effect(() => {
      const roleValue = this.role() as UserRole;
      console.log('Role:', roleValue);
      const config = {
        baseClasses: this.baseClasses,
        getClasses: (value: UserRole) => {
          switch (value) {
            case UserRole.SuperAdmin:
              return { bg: 'bg-error', text: 'text-white' };
            case UserRole.Admin:
              return { bg: 'bg-primary', text: 'text-on-primary' };
            case UserRole.Moderator:
              return { bg: 'bg-secondary-container', text: 'text-on-secondary-container' };
            case UserRole.VerifiedUser:
              return { bg: 'bg-tertiary-fixed-dim', text: 'text-tertiary' };
            case UserRole.User:
              return { bg: 'bg-surface-variant', text: 'text-on-surface-variant' };
            default:
              return { bg: 'bg-indigo-600', text: 'text-white border border-indigo-400' };
          }
        },
        getContent: (value: UserRole) =>
          getRoleTranslationAr(value) === value ? 'مستخدم غير موثق' : getRoleTranslationAr(value),
        // getRoleTranslationAr(value) || this.role() || 'مستخدم غير موثق',
        useTextOnly: true,
      };
      this.badgeService.updateBadge(this.el.nativeElement, roleValue, config);
    });
  }
}
