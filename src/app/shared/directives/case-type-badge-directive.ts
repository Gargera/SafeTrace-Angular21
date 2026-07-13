import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';
import { CaseType } from '../enums/case-type';
import { getCaseTypeTranslationAr } from '../../core/constants/case.type.dictionary';

@Directive({
  selector: '[appCaseTypeBadgeDirective]',
  standalone: true
})
export class CaseTypeBadgeDirective implements OnChanges {
  @Input('appCaseTypeBadgeDirective') caseType!: CaseType;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.addClass(this.el.nativeElement, 'px-sm');
    this.renderer.addClass(this.el.nativeElement, 'py-1');
    this.renderer.addClass(this.el.nativeElement, 'rounded-lg');
    this.renderer.addClass(this.el.nativeElement, 'text-[10px]');
    this.renderer.addClass(this.el.nativeElement, 'font-bold');
  }

  ngOnChanges() {
    const el = this.el.nativeElement;
    el.className = el.className.replace(/\bbg-\S+|text-\S+/g, '');
    
    if (this.caseType === CaseType.Urgent) {
      this.renderer.addClass(el, 'bg-red-100');
      this.renderer.addClass(el, 'text-red-800');
    } else if (this.caseType === CaseType.LongTerm) {
      this.renderer.addClass(el, 'bg-indigo-100');
      this.renderer.addClass(el, 'text-indigo-800');
    } else {
      this.renderer.addClass(el, 'bg-gray-100');
      this.renderer.addClass(el, 'text-gray-800');
    }
    
    el.innerText = getCaseTypeTranslationAr(this.caseType);
  }
}
