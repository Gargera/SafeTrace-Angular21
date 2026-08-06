import { Directive, ElementRef, effect, input } from '@angular/core';
import { AgeCategories } from '../enums/age-categories';
import { getAgeCategoryTranslationAr } from '../../core/constants/dictionaries/age.categories.dictionary';
import { BadgeRenderService } from '../services/badge-render.service';

@Directive({
  selector: '[appAgeBadgeDirective]',
  standalone: true
})
export class AgeBadgeDirective {
  ageCategory = input.required<AgeCategories>({ alias: 'appAgeBadgeDirective' });
  private readonly baseClasses = ['inline-flex', 'items-center', 'gap-xs', 'px-sm', 'py-1', 'rounded-lg', 'text-sm', 'font-bold', 'whitespace-nowrap'];

  constructor(
    private el: ElementRef,
    private badgeRenderService: BadgeRenderService
  ) {
    effect(() => {
      this.badgeRenderService.updateBadge(this.el.nativeElement, this.ageCategory(), {
        baseClasses: this.baseClasses,
        getClasses: () => {
          return { bg: 'bg-surface-container-highest', text: 'text-on-surface' };
        },
        getContent: (value: AgeCategories) => {
          const translation = getAgeCategoryTranslationAr(value);
          let icon = 'person';
          if (value === AgeCategories.Toddler || value === AgeCategories.Child) icon = 'child_care';
          else if (value === AgeCategories.Teenager) icon = 'face';
          else if (value === AgeCategories.LateAdult) icon = 'elderly';
          
          return `<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1">${icon}</span> ${translation}`;
        },
        useTextOnly: false
      });
    });
  }
}
