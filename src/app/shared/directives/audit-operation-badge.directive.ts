import { Directive, ElementRef, effect, input } from '@angular/core';
import { getAuditOperationTranslationAr } from '../../core/constants/dictionaries/audit.operation.dictionary';
import { BadgeRenderService } from '../services/badge-render.service';

@Directive({
  selector: '[appAuditOperationBadge]',
  standalone: true,
})
export class AuditOperationBadgeDirective {
  operation = input.required<string>({ alias: 'appAuditOperationBadge' });
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
      this.badgeRenderService.updateBadge(this.el.nativeElement, this.operation(), {
        baseClasses: this.baseClasses,
        getClasses: (opValue: string) => {
          if (opValue === 'Insert')
            return { bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed' };
          if (opValue === 'Update')
            return { bg: 'bg-secondary-fixed', text: 'text-on-secondary-fixed' };
          if (opValue === 'Delete') return { bg: 'bg-error-container', text: 'text-error' };
          return { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' };
        },
        getContent: (opValue: string) => {
          const translation = getAuditOperationTranslationAr(opValue);
          let icon = 'help';
          if (opValue === 'Insert') icon = 'add_circle';
          else if (opValue === 'Update') icon = 'edit';
          else if (opValue === 'Delete') icon = 'delete';

          return `<span class="material-symbols-outlined  leading-none shrink-0" style="font-variation-settings: 'FILL' 1">${icon}</span><span>${translation}</span>`;
        },
        useTextOnly: false,
      });
    });
  }
}
