import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col w-full h-full animate-pulse overflow-hidden">

      <!-- Header Bar - matches the real chat header -->
      <div class="flex items-center justify-between gap-2 bg-surface-container-low border-b border-outline-variant px-2.5 py-2 sm:px-4 shrink-0 w-full" dir="rtl">
        <!-- Back button -->
        <div class="w-5 h-5 bg-surface-container-high rounded shrink-0"></div>
        <!-- Avatar + Name pill -->
        <div class="flex items-center gap-2 bg-surface-container-high rounded-full px-3 py-1.5 flex-1 max-w-xs">
          <div class="w-7 h-7 rounded-full bg-surface-container-highest shrink-0"></div>
          <div class="h-3 bg-surface-container-highest rounded w-24"></div>
        </div>
        <!-- Action buttons -->
        <div class="flex gap-2 shrink-0">
          <div class="w-8 h-8 bg-surface-container-high rounded-full"></div>
          <div class="w-8 h-8 bg-surface-container-high rounded-full"></div>
        </div>
      </div>

      <!-- Messages Area -->
      <div class="flex-1 flex flex-col gap-4 px-4 py-5 overflow-hidden" dir="ltr">
        <!-- Date Divider -->
        <div class="flex justify-center">
          <div class="h-6 bg-surface-container-high rounded-full w-28"></div>
        </div>

        @for (item of itemsArray; track $index) {
          @if ($index % 3 === 0) {
            <!-- Other user message (left) - shorter bubble -->
            <div class="flex items-end gap-2 self-start max-w-[70%]">
              <div class="w-7 h-7 rounded-full bg-surface-container-high shrink-0"></div>
              <div class="flex flex-col gap-1">
                <div class="h-10 bg-surface-container-high rounded-2xl rounded-bl-sm" [style.width.px]="160 + ($index * 17 % 80)"></div>
                <div class="h-2 bg-surface-container-high rounded w-12"></div>
              </div>
            </div>
          } @else if ($index % 3 === 1) {
            <!-- My message (right) - full bubble -->
            <div class="flex flex-col items-end self-end max-w-[70%] gap-1">
              <div class="h-12 bg-primary/20 rounded-2xl rounded-br-sm" [style.width.px]="140 + ($index * 13 % 100)"></div>
              <div class="h-2 bg-surface-container-high rounded w-10"></div>
            </div>
          } @else {
            <!-- Other user longer message -->
            <div class="flex items-end gap-2 self-start max-w-[70%]">
              <div class="w-7 h-7 rounded-full bg-surface-container-high shrink-0"></div>
              <div class="flex flex-col gap-1">
                <div class="h-16 bg-surface-container-high rounded-2xl rounded-bl-sm" [style.width.px]="200 + ($index * 11 % 60)"></div>
                <div class="h-2 bg-surface-container-high rounded w-12"></div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Input Bar - matches the real message input at the bottom -->
      <div class="shrink-0 border-t border-outline-variant bg-surface-container-lowest px-3 py-3 flex items-center gap-3" dir="rtl">
        <div class="w-8 h-8 bg-surface-container-high rounded-full shrink-0"></div>
        <div class="flex-1 h-10 bg-surface-container-high rounded-full"></div>
        <div class="w-8 h-8 bg-surface-container-high rounded-full shrink-0"></div>
        <div class="w-8 h-8 bg-primary/20 rounded-full shrink-0"></div>
      </div>
    </div>
  `,
})
export class ChatSkeletonComponent {
  readonly items = input<number>(7);

  get itemsArray(): number[] {
    return Array.from({ length: this.items() }, (_, i) => i);
  }
}
