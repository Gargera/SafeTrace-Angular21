import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './icon.html',
})
export class IconComponent {
  name = input.required<'search' | 'chevron' | 'reset' | 'close' | 'filter' | 'back'>();
  size = input('1.25rem');
  extraClass = input('');
  rotation = input(0);
}
