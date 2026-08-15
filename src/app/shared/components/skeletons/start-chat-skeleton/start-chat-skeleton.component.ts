import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-start-chat-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-6xl py-lg px-md flex flex-col gap-lg animate-pulse" dir="rtl">

      <!-- Case Summary Card skeleton -->
      <div class="w-full bg-surface-container-lowest border border-outline-variant rounded-3xl shadow-sm p-md flex flex-col sm:flex-row items-center sm:items-center justify-between gap-md">

        <!-- Case image thumbnail -->
        <div class="p-0.5 bg-surface-container-high rounded-xl shrink-0">
          <div class="w-20 h-20 sm:w-25 sm:h-25 rounded-xl bg-surface-container-highest"></div>
        </div>

        <!-- Case info -->
        <div class="flex-1 min-w-0 flex flex-col items-center sm:items-end gap-2">
          <div class="h-6 bg-surface-container-high rounded-full w-28"></div>
          <div class="h-5 bg-surface-container-high rounded w-48"></div>
          <div class="h-3 bg-surface-container-high rounded w-32"></div>
        </div>
      </div>

      <!-- Start / continue conversation card skeleton -->
      <div class="mx-auto w-full max-w-112 bg-surface-container-lowest border border-outline-variant rounded-full shadow-sm p-lg flex flex-col items-center text-center gap-md">

        <!-- User avatar circle -->
        <div class="w-14 h-14 rounded-full bg-surface-container-high shrink-0"></div>

        <!-- Name + description -->
        <div class="space-y-3 w-full max-w-xs">
          <div class="h-5 bg-surface-container-high rounded w-2/3 mx-auto"></div>
          <div class="space-y-1.5">
            <div class="h-3 bg-surface-container-high rounded w-full"></div>
            <div class="h-3 bg-surface-container-high rounded w-4/5 mx-auto"></div>
          </div>
        </div>

        <!-- Action button -->
        <div class="w-full h-12 bg-surface-container-high rounded-full"></div>

        <!-- Security badge -->
        <div class="h-10 bg-surface-container-high rounded-xl w-4/5"></div>
      </div>

    </div>
  `,
})
export class StartChatSkeletonComponent {}
