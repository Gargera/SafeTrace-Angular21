import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full space-y-3 p-4 animate-pulse">
      <div class="h-10 bg-surface-container-high rounded-xl w-full mb-4"></div>
      @for (row of rowsArray; track $index) {
        <div class="flex items-center space-x-4 space-x-reverse h-12 bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4">
          <div class="h-4 bg-surface-container-high rounded w-1/12"></div>
          <div class="h-4 bg-surface-container-high rounded w-3/12"></div>
          <div class="h-4 bg-surface-container-high rounded w-2/12"></div>
          <div class="h-4 bg-surface-container-high rounded w-2/12"></div>
          <div class="h-4 bg-surface-container-high rounded w-2/12"></div>
          <div class="h-4 bg-surface-container-high rounded w-2/12"></div>
        </div>
      }
    </div>
  `,
})
export class TableSkeletonComponent {
  readonly rows = input<number>(6);

  get rowsArray(): number[] {
    return Array.from({ length: this.rows() }, (_, i) => i);
  }
}
