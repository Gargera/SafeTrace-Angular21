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

      <!-- ================= اليمين: الميديا والأزرار ================= -->
      <div class="w-full lg:w-5/12 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
        
        <!-- Main Media Placeholder -->
        <div class="h-137.5 w-full rounded-xl bg-surface-container-high"></div>

        <!-- Thumbnail gallery strip -->
        <div class="mt-4 flex gap-3 overflow-hidden pb-2">
          @for (i of [1,2,3,4]; track i) {
            <div class="h-20 w-20 shrink-0 rounded-lg bg-surface-container-high border-2 border-transparent"></div>
          }
        </div>

        <!-- Action buttons row -->
        <div class="mt-5 flex flex-wrap items-center gap-2.5 border-t border-outline-variant pt-4">
          <div class="h-10 flex-1 min-w-[100px] rounded-xl bg-surface-container-high"></div>
          <div class="h-10 flex-1 min-w-[100px] rounded-xl bg-surface-container-high"></div>
        </div>

      </div>

      <!-- ================= اليسار: تفاصيل الحالة ================= -->
      <div class="w-full lg:w-7/12 space-y-6">

        <!-- Rejection Reason Card Placeholder -->
        <div class="h-16 w-full rounded-2xl bg-surface-container-high/50"></div>

        <!-- كارت البيانات الأساسية -->
        <div class="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          
          <div class="space-y-4 p-6">
            <!-- Full name -->
            <div class="h-8 w-3/4 rounded bg-surface-container-high"></div>
            <!-- Location -->
            <div class="h-4 w-1/2 rounded bg-surface-container-high"></div>

            <!-- 3-column info grid -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="rounded-lg border border-outline-variant p-4 space-y-2">
                  <div class="h-3 w-16 rounded bg-surface-container-high"></div>
                  <div class="h-5 w-24 rounded bg-surface-container-high"></div>
                </div>
              }
            </div>
          </div>

          <!-- كارت الناشر -->
          <div class="p-6">
            <div class="flex items-center gap-3.5 rounded-xl border border-outline-variant/70 bg-surface-container-low p-3.5">
              <div class="h-11 w-11 shrink-0 rounded-full bg-surface-container-high"></div>
              <div class="flex flex-1 flex-col gap-1.5">
                <div class="h-3 w-20 rounded bg-surface-container-high"></div>
                <div class="h-4 w-32 rounded bg-surface-container-high"></div>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="p-6 space-y-2">
            <div class="h-4 w-full rounded bg-surface-container-high"></div>
            <div class="h-4 w-5/6 rounded bg-surface-container-high"></div>
            <div class="h-4 w-4/6 rounded bg-surface-container-high"></div>
          </div>

        </div>

        <!-- Map Card Placeholder -->
        <div class="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div class="border-b border-outline-variant/50 px-5 py-4">
            <div class="h-5 w-32 rounded bg-surface-container-high"></div>
          </div>
          <div class="h-64 w-full bg-surface-container-high"></div>
        </div>

      </div>

    </div>
  `,
})
export class CaseDetailsSkeletonComponent {}
