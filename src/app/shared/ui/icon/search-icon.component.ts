import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-search-icon',
  standalone: true,
  imports: [IconComponent],
  template: `
    <app-icon [size]="size()" [extraClass]="extraClass()" [rotation]="rotation()">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
      />
    </app-icon>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchIconComponent {
  readonly size = input('1rem');
  readonly extraClass = input('');
  readonly rotation = input(0);
}
