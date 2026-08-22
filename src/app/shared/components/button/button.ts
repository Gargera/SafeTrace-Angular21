import { Component, computed, input, output } from '@angular/core';

export type ButtonVariant =
  'primary' | 'secondary' | 'text' | 'icon' | 'danger' | 'success' | 'outline';

@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './button.html',
  imports: [],
  host: {
    style: 'display: contents;',
  },
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input(false);
  extraClass = input('');
  loading = input(false);
  icon = input('');
  iconClass = input('');
  ariaLabel = input('');

  readonly isNumericIcon = computed(() => /^\d+$/.test(this.icon()));

  onClick = output<Event>();

  get computedDisabled(): boolean {
    return this.disabled() || this.loading();
  }

  get baseClasses(): string {
    const common =
      'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

    const variants: Record<string, string> = {
      primary: 'bg-secondary text-on-secondary shadow-sm hover:opacity-90 hover:shadow',

      secondary:
        'border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container-high',

      outline:
        'border border-outline text-primary bg-transparent hover:bg-surface-container-low active:bg-surface-container',

      danger: 'bg-error text-on-error shadow-sm hover:opacity-90 hover:shadow',

      success: 'bg-on-tertiary-container text-white shadow-sm hover:opacity-90 hover:shadow',
    };

    if (this.variant() === 'icon') {
      return `group inline-flex items-center justify-center rounded-full p-0.5 leading-none transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${this.extraClass()}`;
    }

    if (this.variant() === 'text') {
      return `group inline-flex items-center gap-2 transition-all duration-200 focus:outline-none disabled:pointer-events-none disabled:opacity-50 ${this.extraClass()}`;
    }

    return `${common} ${variants[this.variant()] ?? ''} ${this.extraClass()}`;
  }
}
