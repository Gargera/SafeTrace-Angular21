import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-divider',
  standalone: true,
  template: ` <div class="h-px flex-1 bg-outline-variant/20" [class]="extraClass()"></div> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividerComponent {
  readonly extraClass = input('');
}
