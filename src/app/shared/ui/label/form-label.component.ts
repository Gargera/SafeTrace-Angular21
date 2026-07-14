import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-form-label',
  standalone: true,
  template: `
    <label class="mb-1.5 block text-sm font-medium text-on-surface-variant" [class]="extraClass()">
      <ng-content />
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormLabelComponent {
  readonly extraClass = input('');
}
