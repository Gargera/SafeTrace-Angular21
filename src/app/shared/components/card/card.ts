import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.html',
})
export class CardComponent {
  @Input() extraClass = '';
  @Input() dir: 'ltr' | 'rtl' | 'auto' = 'rtl';

  protected readonly baseClass = 'rounded-xl shadow-sm p-6';
}
