import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ButtonComponent } from './button.component';

@Component({
  selector: 'app-secondary-button',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <app-button
      [type]="type()"
      [disabled]="disabled()"
      variant="secondary"
      [size]="size()"
      [fullWidth]="fullWidth()"
      [extraClass]="extraClass()"
    >
      <ng-content />
    </app-button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecondaryButtonComponent {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly fullWidth = input(false);
  readonly extraClass = input('');
}
