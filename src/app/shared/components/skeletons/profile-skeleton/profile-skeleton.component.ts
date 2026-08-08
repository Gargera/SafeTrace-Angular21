import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full animate-pulse space-y-lg" dir="rtl">

      <!-- 3-col grid: sidebar (col-1) + wide card (col-2-span) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Left Sidebar Card -->
        <div class="col-span-1 bg-white rounded-2xl shadow-sm border border-outline-variant p-6 flex flex-col gap-5 items-center text-center">
          <!-- Avatar circle -->
          <div class="w-36 h-36 rounded-full bg-surface-container-high ring-4 ring-surface shadow-md mt-4"></div>

          <!-- Name + email -->
          <div class="space-y-2 w-full">
            <div class="h-5 bg-surface-container-high rounded w-2/3 mx-auto"></div>
            <div class="h-3 bg-surface-container-high rounded w-3/4 mx-auto"></div>
          </div>

          <!-- Role/status badges section -->
          <div class="w-full space-y-3 pt-4 border-t border-outline-variant/50">
            <!-- Role row -->
            <div class="flex flex-col gap-3 px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl">
              <div class="flex justify-between items-center">
                <div class="h-3 bg-surface-container-high rounded w-20"></div>
                <div class="h-6 bg-surface-container-high rounded-full w-16"></div>
              </div>
              <!-- Select dropdown skeleton -->
              <div class="h-10 bg-surface-container-high rounded-lg w-full mt-2"></div>
              <div class="h-9 bg-surface-container-high rounded-lg w-full"></div>
            </div>

            <!-- Verification status row -->
            <div class="flex justify-between items-center px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl">
              <div class="h-3 bg-surface-container-high rounded w-24"></div>
              <div class="h-6 bg-surface-container-high rounded-full w-16"></div>
            </div>

            <!-- Block status row -->
            <div class="flex justify-between items-center px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl">
              <div class="h-3 bg-surface-container-high rounded w-20"></div>
              <div class="h-6 bg-surface-container-high rounded-full w-20"></div>
            </div>
          </div>
        </div>

        <!-- Right Content Card (2-col span) -->
        <div class="col-span-1 lg:col-span-2 flex flex-col gap-4">
          <div class="bg-white rounded-2xl shadow-sm border border-outline-variant p-6 flex flex-col gap-6">
            <!-- Card header -->
            <div class="flex items-center justify-between border-b border-outline-variant/50 pb-4">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 bg-surface-container-high rounded"></div>
                <div class="h-5 bg-surface-container-high rounded w-40"></div>
              </div>
            </div>

            <div class="flex flex-col gap-6">
              <!-- ID images -->
              <div>
                <div class="h-3 bg-surface-container-high rounded w-32 mb-3"></div>
                <div class="flex flex-col md:flex-row gap-4">
                  <div class="w-full aspect-[1.6/1] bg-surface-container-high rounded-xl"></div>
                  <div class="w-full aspect-[1.6/1] bg-surface-container-high rounded-xl"></div>
                </div>
              </div>

              <!-- Info fields + actions -->
              <div class="flex flex-col justify-between gap-6">
                <div class="space-y-4">
                  <div class="space-y-1">
                    <div class="h-3 bg-surface-container-high rounded w-24"></div>
                    <div class="h-4 bg-surface-container-high rounded w-48"></div>
                  </div>
                  <div class="space-y-1">
                    <div class="h-3 bg-surface-container-high rounded w-20"></div>
                    <div class="h-4 bg-surface-container-high rounded w-36"></div>
                  </div>
                </div>

                <!-- Action buttons -->
                <div class="flex flex-wrap gap-3 pt-6 border-t border-outline-variant/50">
                  <div class="h-11 bg-surface-container-high rounded-xl flex-1 min-w-[100px]"></div>
                  <div class="h-11 bg-surface-container-high rounded-xl flex-1 min-w-[100px]"></div>
                  <div class="h-11 bg-surface-container-high rounded-xl w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ProfileSkeletonComponent {}

