import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Pixel-accurate skeleton for case update/edit forms (urgent-update, long-term-update, unknown-update).
 * Matches: max-w-[760px] card → header → stepper → image upload area → form fields → action buttons
 */
@Component({
  selector: 'app-update-form-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-[760px] px-4 pb-16 pt-6 animate-pulse" role="status" aria-label="جاري تحميل نموذج التعديل" dir="rtl">
      <div class="overflow-hidden rounded-2xl border border-outline-variant/30 bg-white shadow-sm">

        <!-- Header area -->
        <div class="px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b border-outline-variant/20 space-y-1">
          <div class="h-6 bg-surface-container-high rounded w-56"></div>
          <div class="h-4 bg-surface-container-high rounded w-32"></div>
        </div>

        <div class="space-y-8 p-6 md:p-8">

          <!-- Stepper: 4 steps with connectors (mirrors h-14 w-14 boxes) -->
          <div class="flex items-center justify-between">
            @for (i of [1,2,3,4]; track i) {
              <div class="flex flex-col items-center">
                <div class="h-14 w-14 rounded-2xl bg-surface-container-high border border-outline-variant/30"></div>
                <div class="mt-2 h-2.5 w-10 bg-surface-container-high rounded"></div>
              </div>
              @if (i < 4) {
                <div class="mb-5 mx-3 h-0.5 flex-1 rounded-full bg-surface-container-high"></div>
              }
            }
          </div>

          <!-- Image upload zone (mirrors the drag-drop area) -->
          <div class="w-full h-48 rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest flex flex-col items-center justify-center gap-3">
            <div class="w-12 h-12 rounded-full bg-surface-container-high"></div>
            <div class="h-4 bg-surface-container-high rounded w-40"></div>
            <div class="h-3 bg-surface-container-high rounded w-24"></div>
          </div>

          <!-- Form fields: label + input pairs -->
          <div class="space-y-5">
            @for (i of [1,2,3,4,5,6]; track i) {
              <div class="space-y-1.5">
                <div class="h-3 bg-surface-container-high rounded w-24"></div>
                <div class="h-11 bg-surface-container-high rounded-lg w-full"></div>
              </div>
            }
          </div>

          <!-- Action buttons row -->
          <div class="flex justify-between items-center pt-4 border-t border-outline-variant/20">
            <div class="h-11 w-32 bg-surface-container-high rounded-xl"></div>
            <div class="h-11 w-36 bg-surface-container-high rounded-xl"></div>
          </div>

        </div>
      </div>
    </div>
  `,
})
export class UpdateFormSkeletonComponent {}
