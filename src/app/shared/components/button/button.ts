import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './button.html',
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary' | 'text' | 'icon' | 'danger' | 'success'>('primary');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input(false);
  extraClass = input('');
  loading = input(false);
  ariaLabel = input('');

  onClick = output<Event>();

  get baseClasses(): string {
    const common =
      'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      primary: 'bg-secondary text-on-secondary shadow-sm hover:opacity-90 hover:shadow',

      secondary:
        'border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container-high',

      danger: 'bg-error text-on-error shadow-sm hover:opacity-90 hover:shadow',

      success: 'bg-on-tertiary-container text-white shadow-sm hover:opacity-90 hover:shadow',
    };

    if (this.variant() === 'icon') {
      return `group flex items-center justify-center rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${this.extraClass()}`;
    }

    if (this.variant() === 'text') {
      return `group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${this.extraClass()}`;
    }

    return `${common} ${
      variants[this.variant() as keyof typeof variants] ?? ''
    } ${this.extraClass()}`;
  }
}
