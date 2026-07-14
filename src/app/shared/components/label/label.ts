import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-label',
  standalone: true,
  templateUrl: './label.html',
})
export class LabelComponent {
  @Input() extraClass = 'mb-1.5 block text-sm font-medium text-on-surface-variant';
}
