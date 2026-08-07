import { Directive, ElementRef, effect, input } from '@angular/core';
import { VerificationStatus } from '../enums/verification-status';
import { getVerificationStatusTranslationAr } from '../../core/constants/dictionaries/verification.status.dictionary';
import { BadgeRenderService } from '../services/badge-render.service';

@Directive({
  selector: '[appVerificationBadgeDirective]',
  standalone: true
})
export class VerificationBadgeDirective {
  status = input.required<VerificationStatus>({ alias: 'appVerificationBadgeDirective' });

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
    'whitespace-nowrap'
  ];

  constructor(private el: ElementRef, private badgeService: BadgeRenderService) {
    effect(() => {
      const statusValue = this.status();
      const config = {
        baseClasses: this.baseClasses,
        getClasses: (value: VerificationStatus) => {
          switch (value) {
            case VerificationStatus.Verified:
              return { bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed' };
            case VerificationStatus.Pending:
              return { bg: 'bg-secondary-container', text: 'text-white' };
            default:
              return { bg: 'bg-error-container', text: 'text-on-error-container' };
          }
        },
        getContent: (value: VerificationStatus) => {
          const translation = getVerificationStatusTranslationAr(value) || 'غير موثق';
          const icon = this.getIcon(value);
          return `<span class="material-symbols-outlined text-[16px] leading-none shrink-0" style="font-variation-settings: 'FILL' 1">${icon}</span><span>${translation}</span>`;
        },
        useTextOnly: false
      };
      this.badgeService.updateBadge(this.el.nativeElement, statusValue, config);
    });
  }

  private getIcon(status: VerificationStatus): string {
    switch (status) {
      case VerificationStatus.Verified:
        return 'verified';
      case VerificationStatus.Pending:
        return 'pending';
      default:
        return 'error';
    }
  }
}
