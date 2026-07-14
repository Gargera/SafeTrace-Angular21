import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ButtonComponent } from './button.component';

@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <app-button [type]="type()" [disabled]="disabled()" variant="icon" [extraClass]="extraClass()">
      <ng-content />
    </app-button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconButtonComponent {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly extraClass = input('');
}
