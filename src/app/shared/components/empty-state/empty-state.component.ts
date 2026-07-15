import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [NgClass],
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  icon = input('images/empty.png');
  title = input('لا توجد بيانات');
  message = input('لم يتم العثور على أي عناصر تطابق بحثك.');
  containerClass = input('');
}