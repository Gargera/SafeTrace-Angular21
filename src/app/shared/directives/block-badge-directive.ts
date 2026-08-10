import { Directive, ElementRef, effect, input } from '@angular/core';
import { BadgeRenderService } from '../services/badge-render.service';

@Directive({
  selector: '[appBlockBadgeDirective]',
  standalone: true,
})
export class BlockBadgeDirective {
  isBlocked = input.required<boolean>({ alias: 'appBlockBadgeDirective' });
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
      this.badgeRenderService.updateBadge(this.el.nativeElement, this.isBlocked(), {
        baseClasses: this.baseClasses,
        getClasses: (blocked: boolean) => {
          if (blocked) return { bg: 'bg-error', text: 'text-white' };
          return { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' };
        },
        getContent: (blocked: boolean) => {
          const translation = blocked ? 'محظور' : 'نشط';
          const icon = blocked ? 'block' : 'check_circle';
          return `<span class="material-symbols-outlined  leading-none shrink-0" style="font-variation-settings: 'FILL' 1">${icon}</span><span>${translation}</span>`;
        },
        useTextOnly: false,
      });
    });
  }
}
