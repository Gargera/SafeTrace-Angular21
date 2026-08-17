import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-start-chat-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto w-full max-w-6xl py-lg px-md flex flex-col gap-lg animate-pulse" dir="rtl">

      <!-- Case summary card skeleton -->
      <div
        class="w-full bg-surface-container-lowest border border-outline-variant rounded-3xl shadow-sm p-md flex flex-col sm:flex-row items-center justify-between gap-md">

        <!-- Case image -->
        <div class="p-0.5 bg-primary-container rounded-xl shrink-0 border border-primary/10">
          <div class="w-20 h-20 sm:w-25 sm:h-25 rounded-xl bg-surface-container-high"></div>
        </div>

        <!-- Case info -->
        <div class="flex-1 min-w-0 text-center sm:text-right">

          <!-- status badge -->
          <div class="inline-flex items-center gap-1 bg-surface-container-high rounded-full px-sm py-2xs mb-xs">
            <div class="h-3 w-20 rounded-full bg-surface-container-highest"></div>
            <div class="w-1.5 h-1.5 rounded-full bg-surface-container-highest rounded-full"></div>
          </div>

          <!-- title -->
          <div class="h-6 bg-surface-container-high rounded w-48 mx-auto sm:mr-0 sm:ml-auto"></div>

          <!-- owner -->
          <div class="h-3 bg-surface-container-high rounded w-32 mt-2 mx-auto sm:mr-0 sm:ml-auto"></div>

        </div>
      </div>


      <!-- Start / continue conversation card -->
      <div
        class="mx-auto w-full max-w-112.5 bg-surface-container-lowest border border-outline-variant rounded-full shadow-sm p-lg flex flex-col items-center text-center gap-md">


        <!-- Avatar + chat badge -->
        <div class="relative w-14 h-14 rounded-full shrink-0">

          <div class="w-full h-full rounded-full bg-surface-container-high"></div>

          <!-- chat badge -->
          <div
            class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface-container-high border-2 border-surface-container-lowest">
          </div>

        </div>


        <!-- Name + description -->
        <div class="w-full">

          <div class="h-5 bg-surface-container-high rounded w-44 mx-auto"></div>

          <div class="space-y-2 mt-xs max-w-70 mx-auto">
            <div class="h-3 bg-surface-container-high rounded w-full"></div>
            <div class="h-3 bg-surface-container-high rounded w-4/5 mx-auto"></div>
          </div>

        </div>


        <!-- Button -->
        <div class="w-full h-12 bg-surface-container-high rounded-full"></div>


        <!-- Security badge -->
        <div
          class="flex items-center justify-center gap-xs w-4/5 h-10 rounded-xl bg-surface-container-low">

          <div class="w-4 h-4 rounded-full bg-surface-container-high"></div>

          <div class="h-3 bg-surface-container-high rounded w-48"></div>

        </div>

      </div>

    </div>
  `,
})
export class StartChatSkeletonComponent { }