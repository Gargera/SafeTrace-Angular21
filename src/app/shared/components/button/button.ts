import { Component, EventEmitter, Input, Output } from '@angular/core';


@Component({
  selector: 'app-button',
  standalone: true,
  
  templateUrl: './button.html',
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'text' | 'icon' = 'primary';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() extraClass = '';
  @Input() loading = false;
  @Input() ariaLabel = '';
  @Output() onClick = new EventEmitter<Event>();

  get baseClasses(): string {
    if (this.variant === 'icon') {
      return 'group flex items-center justify-center rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary active:scale-95 disabled:pointer-events-none disabled:opacity-50 ' + this.extraClass;
    }
    if (this.variant === 'text') {
      return 'group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none disabled:pointer-events-none disabled:opacity-50 ' + this.extraClass;
    }
    const common = 'inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 ' + this.extraClass;
    if (this.variant === 'primary') {
      return common + ' bg-secondary text-on-secondary shadow-sm hover:opacity-90 hover:shadow';
    }
    if (this.variant === 'secondary') {
      return common + ' border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container-high';
    }
    return common;
  }
}

