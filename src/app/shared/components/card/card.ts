import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.html',
})
export class CardComponent {
  extraClass = input('rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm');
  dir = input<'ltr' | 'rtl' | 'auto'>('rtl');
}
