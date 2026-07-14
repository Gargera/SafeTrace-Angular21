import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      class="inline-flex items-center justify-center gap-2 rounded-xl border border-transparent transition-all duration-200 disabled:pointer-events-none disabled:opacity-50"
      [class]="buttonClasses()"
    >
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly fullWidth = input(false);
  readonly extraClass = input('');

  protected readonly buttonClasses = computed(() => {
    const variant = this.variant();
    const size = this.size();
    const fullWidth = this.fullWidth();
    const baseClasses = [
      'font-semibold shadow-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40',
      'active:scale-95',
      fullWidth ? 'w-full' : '',
    ];

    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-secondary text-on-secondary hover:opacity-90 hover:shadow',
      secondary:
        'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container-high',
      text: 'border-transparent bg-transparent px-0 text-on-surface-variant hover:bg-surface-container-high hover:text-primary',
      icon: 'h-11 w-11 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface-variant transition-all duration-200 hover:bg-surface-container-high hover:shadow-sm',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-5 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return [...baseClasses, variantClasses[variant], sizeClasses[size], this.extraClass()]
      .filter(Boolean)
      .join(' ');
  });
}
