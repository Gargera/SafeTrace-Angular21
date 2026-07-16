import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerVariant = 'primary' | 'secondary';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  templateUrl: './loading-spinner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {
  title = input<string>();
  subtitle = input<string>();

  size = input<SpinnerSize>('md');
  variant = input<SpinnerVariant>('secondary');

  fullscreen = input(false);
  containerClass = input('');

  showTitle = input(true);
  showSubtitle = input(true);
}
