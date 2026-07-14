import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.html',
})
export class CardComponent {
  @Input() extraClass = 'rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm';
  @Input() dir: 'ltr' | 'rtl' | 'auto' = 'rtl';
}
