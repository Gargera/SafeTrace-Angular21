import { Directive, ElementRef, effect, input, Renderer2 } from '@angular/core';
import { Gender } from '../enums/gender';
import { getGenderTranslationAr } from '../../core/constants/gender.dictionary';

@Directive({
  selector: '[appGenderBadgeDirective]',
  standalone: true
})
export class GenderBadgeDirective {
  gender = input.required<Gender>({ alias: 'appGenderBadgeDirective' });

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.addClass(this.el.nativeElement, 'px-sm');
    this.renderer.addClass(this.el.nativeElement, 'py-1');
    this.renderer.addClass(this.el.nativeElement, 'rounded-lg');
    this.renderer.addClass(this.el.nativeElement, 'text-[10px]');
    this.renderer.addClass(this.el.nativeElement, 'font-bold');
    effect(() => {
      const el = this.el.nativeElement;
      el.className = el.className.replace(/\bbg-\S+|text-\S+/g, '');
      
      if (this.gender() === Gender.Male) {
        this.renderer.addClass(el, 'bg-blue-100');
        this.renderer.addClass(el, 'text-blue-800');
      } else {
        this.renderer.addClass(el, 'bg-pink-100');
        this.renderer.addClass(el, 'text-pink-800');
      }
      el.innerText = getGenderTranslationAr(this.gender());
    });
  }
}