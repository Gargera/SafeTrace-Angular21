import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Pixel-accurate skeleton for urgent/long-term/unknown/founded case detail pages.
 * Matches the real layout:
 *   - Header breadcrumb area
 *   - flex-col lg:flex-row
 *     - Left 5/12: main image (h-[550px]) + thumbnail gallery strip + action buttons
 *     - Right 7/12: name + badges + publisher card + 2x2 info grid + description + map
 */
@Component({
  selector: 'app-case-details-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col lg:flex-row items-start gap-6 animate-pulse" role="status" aria-label="جاري تحميل تفاصيل الحالة">

      <!-- ===== LEFT COLUMN: Media + Buttons (w-full lg:w-5/12) ===== -->
      <div class="w-full lg:w-5/12 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">

        <!-- Main image placeholder (mirrors h-[550px] of the real img/video) -->
        <div class="w-full h-[550px] rounded-xl bg-surface-container-high"></div>

        <!-- Thumbnail gallery strip (4 thumbnails 96x96) -->
        <div class="mt-4 flex gap-3 overflow-hidden pb-2">
          @for (i of [1,2,3,4]; track i) {
            <div class="h-24 w-24 shrink-0 rounded-lg bg-surface-container-high"></div>
          }
        </div>

        <!-- Action buttons row -->
        <div class="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-outline-variant/50">
          <div class="h-11 flex-1 min-w-[100px] rounded-2xl bg-surface-container-high"></div>
          <div class="h-11 flex-1 min-w-[100px] rounded-2xl bg-surface-container-high"></div>
        </div>
      </div>

      <!-- ===== RIGHT COLUMN: Details (w-full lg:w-7/12) ===== -->
      <div class="w-full lg:w-7/12 space-y-6">

        <!-- Name + Location card -->
        <div class="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">

          <!-- Full name (headline) -->
          <div class="space-y-2">
            <div class="h-8 bg-surface-container-high rounded w-3/4"></div>
            <div class="h-4 bg-surface-container-high rounded w-1/2"></div>
          </div>

          <!-- Status badges row -->
          <div class="flex flex-wrap gap-2">
            <div class="h-7 w-20 rounded-full bg-surface-container-high"></div>
            <div class="h-7 w-24 rounded-full bg-surface-container-high"></div>
            <div class="h-7 w-16 rounded-full bg-surface-container-high"></div>
          </div>

          <!-- Publisher card (avatar + name) -->
          <div class="flex items-center gap-3.5 rounded-xl border border-outline-variant/70 bg-surface-container-low p-3.5">
            <div class="h-11 w-11 rounded-full bg-surface-container-high shrink-0"></div>
            <div class="flex flex-col gap-1.5 flex-1">
              <div class="h-3 bg-surface-container-high rounded w-16"></div>
              <div class="h-4 bg-surface-container-high rounded w-32"></div>
            </div>
          </div>

          <!-- 2x2 info grid (age, date, gender, ...) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            @for (i of [1,2,3,4]; track i) {
              <div class="rounded-lg border border-outline-variant p-4 space-y-2">
                <div class="h-3 bg-surface-container-high rounded w-16"></div>
                <div class="h-5 bg-surface-container-high rounded w-24"></div>
              </div>
            }
          </div>

          <!-- Description text lines -->
          <div class="space-y-2 pt-2">
            <div class="h-4 bg-surface-container-high rounded w-full"></div>
            <div class="h-4 bg-surface-container-high rounded w-5/6"></div>
            <div class="h-4 bg-surface-container-high rounded w-4/6"></div>
          </div>
        </div>

        <!-- Map card placeholder -->
        <div class="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div class="px-4 py-3 border-b border-outline-variant/50">
            <div class="h-4 bg-surface-container-high rounded w-32"></div>
          </div>
          <div class="h-48 bg-surface-container-high w-full"></div>
        </div>

      </div>
    </div>
  `,
})
export class CaseDetailsSkeletonComponent {}
