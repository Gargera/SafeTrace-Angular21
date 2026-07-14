import { Component, input } from '@angular/core';

@Component({
  selector: 'app-label',
  standalone: true,
  templateUrl: './label.html',
})
export class LabelComponent {
  extraClass = input('mb-1.5 block text-sm font-medium text-on-surface-variant');
}
