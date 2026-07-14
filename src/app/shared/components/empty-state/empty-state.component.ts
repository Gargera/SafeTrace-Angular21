import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [NgClass],
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  @Input() icon = 'images/empty.png';
  @Input() title = 'لا توجد بيانات';
  @Input() message = 'لم يتم العثور على أي عناصر تطابق بحثك.';
  @Input() containerClass = '';
}