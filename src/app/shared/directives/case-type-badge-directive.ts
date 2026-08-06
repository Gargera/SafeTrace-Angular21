import { Directive, ElementRef, effect, input } from '@angular/core';
import { CaseType } from '../enums/case-type';
import { getCaseTypeTranslationAr } from '../../core/constants/dictionaries/case.type.dictionary';
import { BadgeRenderService } from '../services/badge-render.service';

@Directive({
  selector: '[appCaseTypeBadgeDirective]',
  standalone: true
})
export class CaseTypeBadgeDirective {
  caseType = input.required<CaseType>({ alias: 'appCaseTypeBadgeDirective' });
  private readonly baseClasses = ['inline-flex', 'items-center', 'gap-xs', 'px-sm', 'py-1', 'rounded-lg', 'text-sm', 'font-bold', 'whitespace-nowrap'];

  constructor(
    private el: ElementRef,
    private badgeRenderService: BadgeRenderService
  ) {
    effect(() => {
      this.badgeRenderService.updateBadge(this.el.nativeElement, this.caseType(), {
        baseClasses: this.baseClasses,
        getClasses: (val: CaseType) => {
          if (val === CaseType.Urgent) return { bg: 'bg-red-100', text: 'text-red-800' };
          if (val === CaseType.LongTerm) return { bg: 'bg-indigo-100', text: 'text-indigo-800' };
          return { bg: 'bg-gray-100', text: 'text-gray-800' };
        },
        getContent: (val: CaseType) => {
          const translation = getCaseTypeTranslationAr(val);
          let icon = 'info';
          if (val === CaseType.Urgent) icon = 'warning';
          if (val === CaseType.LongTerm) icon = 'update';
          return `<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1">${icon}</span> ${translation}`;
        },
        useTextOnly: false
      });
    });
  }
}
