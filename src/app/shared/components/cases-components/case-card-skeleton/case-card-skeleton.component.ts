import { Component } from '@angular/core';

@Component({
  selector: 'app-case-card-skeleton',
  standalone: true,
  template: `
    <article
      class="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md animate-pulse"
    >
      <div class="relative mb-4 h-56 w-full overflow-hidden rounded-1.5rem bg-surface-variant">
        <div class="absolute top-3 right-3 h-5 w-16 rounded-full bg-surface-container-high"></div>
        <div
          class="absolute bottom-3 right-3 h-6 w-24 rounded-full bg-surface-container-high"
        ></div>
      </div>

      <div class="p-0 space-y-4">
        <div class="h-5 w-3/4 rounded-full bg-surface-variant"></div>

        <div class="space-y-2 mb-6">
          <div class="flex justify-between items-center text-sm">
            <div class="h-3 w-20 rounded-full bg-surface-variant"></div>
            <div class="h-3 w-16 rounded-full bg-surface-variant"></div>
          </div>

          <div class="flex justify-between items-center text-sm">
            <div class="h-3 w-20 rounded-full bg-surface-variant"></div>
            <div class="h-6 w-24 rounded-full bg-surface-variant"></div>
          </div>

          <div class="flex justify-between items-center text-sm">
            <div class="h-3 w-28 rounded-full bg-surface-variant"></div>
            <div class="h-3 w-20 rounded-full bg-surface-variant"></div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="h-11 rounded-md bg-surface-variant"></div>
          <div class="h-11 rounded-md bg-surface-variant"></div>
        </div>
      </div>
    </article>
  `,
})
export class CaseCardSkeletonComponent {}
