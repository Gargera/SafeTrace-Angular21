import { Directive, ElementRef, effect, input } from '@angular/core';
import { CaseStatus } from '../enums/case-status';
import { getCaseStatusTranslationAr } from '../../core/constants/dictionaries/case.status.dictionary';
import { BadgeRenderService } from '../services/badge-render.service';

@Directive({
  selector: '[appCaseStatusBadgeDirective]',
  standalone: true,
})
export class CaseStatusBadgeDirective {
  status = input.required<CaseStatus>({ alias: 'appCaseStatusBadgeDirective' });
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
      this.badgeRenderService.updateBadge(this.el.nativeElement, this.status(), {
        baseClasses: this.baseClasses,
        getClasses: (val: CaseStatus) => {
          switch (val) {
            case CaseStatus.Pending:
              return { bg: 'bg-secondary-container', text: 'text-on-secondary-container' };
            case CaseStatus.Active:
              return { bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed' };
            case CaseStatus.Found:
              return { bg: 'bg-tertiary-fixed-dim', text: 'text-tertiary' };
            case CaseStatus.Deleted:
              return { bg: 'bg-error-container', text: 'text-error' };
            case CaseStatus.Rejected:
              return { bg: 'bg-error', text: 'text-white' };
            case CaseStatus.Expired:
              return { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' };
            default:
              return { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' };
          }
        },
        getContent: (val: CaseStatus) => {
          const translation = getCaseStatusTranslationAr(val);
          let icon = 'help';
          switch (val) {
            case CaseStatus.Pending:
              icon = 'hourglass_empty';
              break;
            case CaseStatus.Active:
              icon = 'check_circle';
              break;
            case CaseStatus.Found:
              icon = 'how_to_reg';
              break;
            case CaseStatus.Deleted:
              icon = 'delete';
              break;
            case CaseStatus.Rejected:
              icon = 'cancel';
              break;
            case CaseStatus.Expired:
              icon = 'event_busy';
              break;
          }
          return `<span class="material-symbols-outlined ms-icon-md leading-none shrink-0" style="font-variation-settings: 'FILL' 1">${icon}</span><span>${translation}</span>`;
        },
        useTextOnly: false,
      });
    });
  }
}
