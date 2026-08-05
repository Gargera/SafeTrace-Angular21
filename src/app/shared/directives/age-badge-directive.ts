import { Directive, ElementRef, effect, input, Renderer2 } from '@angular/core';
import { AgeCategories } from '../enums/age-categories';
import { getAgeCategoryTranslationAr } from '../../core/constants/dictionaries/age.categories.dictionary';

@Directive({
  selector: '[appAgeBadgeDirective]',
  standalone: true
})
export class AgeBadgeDirective {
  ageCategory = input.required<AgeCategories>({ alias: 'appAgeBadgeDirective' });

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.addClass(this.el.nativeElement, 'px-sm');
    this.renderer.addClass(this.el.nativeElement, 'py-1');
    this.renderer.addClass(this.el.nativeElement, 'rounded-lg');
    this.renderer.addClass(this.el.nativeElement, 'text-[10px]');
    this.renderer.addClass(this.el.nativeElement, 'font-bold');
    this.renderer.addClass(this.el.nativeElement, 'bg-surface-container-highest');
    effect(() => {
      this.el.nativeElement.innerText = getAgeCategoryTranslationAr(this.ageCategory());
    });
  }
}