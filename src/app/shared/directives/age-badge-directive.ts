import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';
import { AgeCategories } from '../enums/age-categories';
import { AGE_CATEGORIES_TRANSLATIONS_AR } from '../../core/constants/age.categories.dictionary';

@Directive({
  selector: '[appAgeBadgeDirective]',
  standalone: true
})
export class AgeBadgeDirective implements OnChanges {
  @Input('appAgeBadgeDirective') ageCategory!: AgeCategories;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.addClass(this.el.nativeElement, 'px-sm');
    this.renderer.addClass(this.el.nativeElement, 'py-1');
    this.renderer.addClass(this.el.nativeElement, 'rounded-lg');
    this.renderer.addClass(this.el.nativeElement, 'text-[10px]');
    this.renderer.addClass(this.el.nativeElement, 'font-bold');
    this.renderer.addClass(this.el.nativeElement, 'bg-surface-container-highest');
  }

  ngOnChanges() {
    this.el.nativeElement.innerText = AGE_CATEGORIES_TRANSLATIONS_AR[this.ageCategory] || this.ageCategory;
  }
}