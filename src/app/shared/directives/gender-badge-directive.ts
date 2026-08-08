import { Directive, ElementRef, effect, input } from '@angular/core';
import { Gender } from '../enums/gender';
import { getGenderTranslationAr } from '../../core/constants/dictionaries/gender.dictionary';
import { BadgeRenderService } from '../services/badge-render.service';

@Directive({
  selector: '[appGenderBadgeDirective]',
  standalone: true
})
export class GenderBadgeDirective {
  gender = input.required<Gender>({ alias: 'appGenderBadgeDirective' });
  private readonly baseClasses = ['inline-flex', 'items-center', 'justify-center', 'gap-1.5', 'px-3', 'py-1', 'rounded-lg', 'text-sm', 'font-bold', 'whitespace-nowrap'];

  constructor(
    private el: ElementRef,
    private badgeRenderService: BadgeRenderService
  ) {
    effect(() => {
      this.badgeRenderService.updateBadge(this.el.nativeElement, this.gender(), {
        baseClasses: this.baseClasses,
        getClasses: (val: Gender) => {
          if (val === Gender.Male) return { bg: 'bg-blue-100', text: 'text-blue-800' };
          return { bg: 'bg-pink-100', text: 'text-pink-800' };
        },
        getContent: (val: Gender) => {
          const translation = getGenderTranslationAr(val);
          const icon = val === Gender.Male ? 'man' : 'woman';
          return `<span class="material-symbols-outlined text-[16px] leading-none shrink-0" style="font-variation-settings: 'FILL' 1">${icon}</span><span>${translation}</span>`;
        },
        useTextOnly: false
      });
    });
  }
}
