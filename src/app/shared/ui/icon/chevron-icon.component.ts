import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-chevron-icon',
  standalone: true,
  imports: [IconComponent],
  template: `
    <app-icon [size]="size()" [extraClass]="extraClass()" [rotation]="rotation()">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </app-icon>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChevronIconComponent {
  readonly size = input('1rem');
  readonly extraClass = input('');
  readonly rotation = input(0);
}
