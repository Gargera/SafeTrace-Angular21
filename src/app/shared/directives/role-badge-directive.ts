import { Directive, ElementRef, effect, input } from '@angular/core';
import { UserRole } from '../enums/user-role';
import { getRoleTranslationAr } from '../../core/constants/dictionaries/roles.dictionary';
import { BadgeRenderService } from '../services/badge-render.service';

@Directive({
  selector: '[appRoleBadgeDirective]',
  standalone: true,
})
export class RoleBadgeDirective {
  role = input.required<string>({ alias: 'appRoleBadgeDirective' });
  private readonly baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'gap-1.5',
    'px-3',
    'py-1',
    'rounded-lg',
    'text-sm',
    'font-bold',
    'whitespace-nowrap',
  ];

  constructor(
    private el: ElementRef,
    private badgeRenderService: BadgeRenderService,
  ) {
    effect(() => {
      this.badgeRenderService.updateBadge(this.el.nativeElement, this.role() as UserRole, {
        baseClasses: this.baseClasses,
        getClasses: (val: UserRole) => {
          if (val === UserRole.SuperAdmin) return { bg: 'bg-error', text: 'text-white' };
          if (val === UserRole.Admin) return { bg: 'bg-primary', text: 'text-on-primary' };
          if (val === UserRole.Moderator)
            return { bg: 'bg-secondary-container', text: 'text-on-secondary-container' };
          if (val === UserRole.VerifiedUser)
            return { bg: 'bg-tertiary-fixed-dim', text: 'text-tertiary' };
          if (val === UserRole.User)
            return { bg: 'bg-surface-variant', text: 'text-on-surface-variant' };
          return { bg: 'bg-indigo-600 border border-indigo-400', text: 'text-white' };
        },
        getContent: (val: UserRole) => {
          const translation = getRoleTranslationAr(val) || val || 'مستخدم غير معروف';
          let icon = 'group';
          if (val === UserRole.SuperAdmin) icon = 'shield_person';
          else if (val === UserRole.Admin) icon = 'admin_panel_settings';
          else if (val === UserRole.Moderator) icon = 'gavel';
          else if (val === UserRole.VerifiedUser) icon = 'verified_user';
          else if (val === UserRole.User) icon = 'person';

          return `<span class="material-symbols-outlined ms-icon-md leading-none shrink-0" style="font-variation-settings: 'FILL' 1">${icon}</span><span>${translation}</span>`;
        },
        useTextOnly: false,
      });
    });
  }
}
