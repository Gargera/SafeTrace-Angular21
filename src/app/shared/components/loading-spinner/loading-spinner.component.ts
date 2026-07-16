import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  templateUrl: './loading-spinner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {
  title = input<string>();
  subtitle = input<string>();
  size = input<'sm' | 'md' | 'lg'>('md');
  fullscreen = input(false);
  containerClass = input('');
}
