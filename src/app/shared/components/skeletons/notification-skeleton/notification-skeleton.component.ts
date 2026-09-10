import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Pixel-accurate skeleton for the notifications-tab.
 * Mirrors: icon-square (p-2 rounded-lg) + body (content + timestamp + actions)
 * + optional unread dot on the right.
 */
@Component({
  selector: 'app-notification-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-sm animate-pulse" role="status" aria-label="جاري تحميل الإشعارات" dir="rtl">
      @for (i of itemsArray; track $index) {
        <div class="flex items-start gap-md p-md rounded-xl border border-outline-variant bg-surface-container-high">

          <!-- Icon square (matches p-2 rounded-lg text-white shrink-0) -->
          <div class="w-9 h-9 rounded-lg bg-surface-container-highest shrink-0"></div>

          <!-- Body -->
          <div class="flex-1 min-w-0 space-y-2">
            <!-- Content line + timestamp on same row (flex-col-reverse sm:flex-row) -->
            <div class="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-xs">
              <div class="h-4 bg-surface-container-high rounded w-4/5"></div>
              <div class="h-3 bg-surface-container-high rounded w-16 shrink-0"></div>
            </div>
            <!-- Actions row -->
            <div class="flex items-center gap-md">
              <div class="h-3 bg-surface-container-high rounded w-20"></div>
              <div class="h-3 bg-surface-container-high rounded w-16"></div>
              <div class="h-3 bg-surface-container-high rounded w-10 mr-auto"></div>
            </div>
          </div>

          <!-- Unread dot (w-2 h-2 rounded-full) -->
          <div class="w-2 h-2 rounded-full bg-surface-container-highest shrink-0 mt-1"></div>
        </div>
      }
    </div>
  `,
})
export class NotificationSkeletonComponent {
  readonly items = input<number>(6);
  get itemsArray(): number[] {
    return Array.from({ length: this.items() }, (_, i) => i);
  }
}
