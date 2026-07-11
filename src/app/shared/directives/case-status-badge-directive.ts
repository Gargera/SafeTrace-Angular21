import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';
import { CaseStatus } from '../enums/case-status';
import { CASE_STATUS_TRANSLATIONS_AR } from '../../core/constants/case.status.dictionary';

@Directive({
  selector: '[appCaseStatusBadgeDirective]',
  standalone: true
})
export class CaseStatusBadgeDirective implements OnChanges {
  @Input('appCaseStatusBadgeDirective') status!: CaseStatus;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.addClass(this.el.nativeElement, 'px-sm');
    this.renderer.addClass(this.el.nativeElement, 'py-1');
    this.renderer.addClass(this.el.nativeElement, 'rounded-full');
    this.renderer.addClass(this.el.nativeElement, 'font-bold');
    this.renderer.addClass(this.el.nativeElement, 'text-[10px]');
  }

  ngOnChanges() {
    const el = this.el.nativeElement;
    el.className = el.className.replace(/\bbg-\S+|text-\S+/g, '');
    
    switch (this.status) {
      case CaseStatus.Pending:
        this.renderer.addClass(el, 'bg-secondary-container');
        this.renderer.addClass(el, 'text-on-secondary-container');
        break;
      case CaseStatus.Active:
        this.renderer.addClass(el, 'bg-tertiary-fixed');
        this.renderer.addClass(el, 'text-on-tertiary-fixed');
        break;
      case CaseStatus.Found:
        this.renderer.addClass(el, 'bg-primary');
        this.renderer.addClass(el, 'text-white');
        break;
      case CaseStatus.Deleted:
        this.renderer.addClass(el, 'bg-error-container');
        this.renderer.addClass(el, 'text-error');
        break;
      case CaseStatus.Rejected:
        this.renderer.addClass(el, 'bg-error');
        this.renderer.addClass(el, 'text-white');
        break;
      case CaseStatus.Expired:
        this.renderer.addClass(el, 'bg-surface-container-highest');
        this.renderer.addClass(el, 'text-on-surface-variant');
        break;
    }
    el.innerText = CASE_STATUS_TRANSLATIONS_AR[this.status] || this.status;
  }
}