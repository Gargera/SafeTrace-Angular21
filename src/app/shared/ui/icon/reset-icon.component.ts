import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-reset-icon',
  standalone: true,
  imports: [IconComponent],
  template: `
    <app-icon [size]="size()" [extraClass]="extraClass()" [rotation]="rotation()">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 4v6h6M20 20v-6h-6M20 9a8 8 0 00-13.66-5.66L4 6M4 15a8 8 0 0013.66 5.66L20 18"
      />
    </app-icon>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetIconComponent {
  readonly size = input('1rem');
  readonly extraClass = input('');
  readonly rotation = input(0);
}
