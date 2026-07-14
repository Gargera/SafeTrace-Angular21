import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './icon.html',
})
export class IconComponent {
  @Input({ required: true }) name!: 'search' | 'chevron' | 'reset' | 'close' | 'filter' | 'back';
  @Input() size = '1.25rem';
  @Input() extraClass = '';
  @Input() rotation = 0;
}
