import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [NgClass],
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  @Input() title: string = 'لا توجد بيانات';
  @Input() message: string = 'لم يتم العثور على أي عناصر تطابق بحثك.';
  @Input() containerClass: string = '';
}
