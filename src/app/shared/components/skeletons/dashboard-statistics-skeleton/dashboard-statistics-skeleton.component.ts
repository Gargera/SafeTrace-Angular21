import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-statistics-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 w-full animate-pulse">

      <!-- Stat Cards: 3 cols like the real grid-cols-2 sm:grid-cols-3 -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        @for (i of [1,2,3,4,5,6]; track i) {
          <div class="relative bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-4 flex flex-col justify-between shadow-sm overflow-hidden min-h-[88px]">
            <!-- colored top accent bar -->
            <div class="absolute top-0 inset-x-0 h-1 bg-surface-container-high rounded-t-xl"></div>
            <!-- icon square -->
            <div class="w-9 h-9 bg-surface-container-high rounded-lg mt-1"></div>
            <!-- label + value -->
            <div class="mt-3 space-y-1.5">
              <div class="h-3 bg-surface-container-high rounded w-20"></div>
              <div class="h-6 bg-surface-container-high rounded w-12"></div>
            </div>
          </div>
        }
      </div>

      <!-- Charts Row: 2 donut charts side by side -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Donut 1 -->
        <div class="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
          <div class="h-5 bg-surface-container-high rounded w-44"></div>
          <div class="flex flex-col sm:flex-row items-center gap-6">
            <!-- Donut circle -->
            <div class="relative w-40 h-40 shrink-0">
              <div class="w-40 h-40 rounded-full border-[18px] border-surface-container-high"></div>
            </div>
            <!-- Legend list -->
            <div class="flex flex-col gap-3 w-full">
              @for (i of [1,2,3,4]; track i) {
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-surface-container-high shrink-0"></div>
                    <div class="h-3 bg-surface-container-high rounded w-20"></div>
                  </div>
                  <div class="h-3 bg-surface-container-high rounded w-12"></div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Donut 2 -->
        <div class="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
          <div class="flex justify-between items-start">
            <div class="h-5 bg-surface-container-high rounded w-32"></div>
            <div class="space-y-1 text-right">
              <div class="h-3 bg-surface-container-high rounded w-20"></div>
              <div class="h-5 bg-surface-container-high rounded w-28"></div>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row items-center gap-6">
            <div class="relative w-40 h-40 shrink-0">
              <div class="w-40 h-40 rounded-full border-[18px] border-surface-container-high"></div>
            </div>
            <div class="flex flex-col gap-3 w-full">
              @for (i of [1,2,3]; track i) {
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-surface-container-high shrink-0"></div>
                    <div class="h-3 bg-surface-container-high rounded w-20"></div>
                  </div>
                  <div class="h-3 bg-surface-container-high rounded w-12"></div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Complaints donut + Bar chart row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Complaints Donut -->
        <div class="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
          <div class="h-5 bg-surface-container-high rounded w-36"></div>
          <div class="flex flex-col sm:flex-row items-center gap-6">
            <div class="relative w-40 h-40 shrink-0">
              <div class="w-40 h-40 rounded-full border-[18px] border-surface-container-high"></div>
            </div>
            <div class="flex flex-col gap-3 w-full">
              @for (i of [1,2,3]; track i) {
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-surface-container-high shrink-0"></div>
                    <div class="h-3 bg-surface-container-high rounded w-20"></div>
                  </div>
                  <div class="h-3 bg-surface-container-high rounded w-12"></div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Case Type Bars -->
        <div class="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
          <div class="h-5 bg-surface-container-high rounded w-44"></div>
          <div class="flex items-end gap-4 justify-around h-40">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="flex flex-col items-center gap-2 flex-1">
                <div class="w-full bg-surface-container-high rounded-t-md" [style.height.px]="30 + i * 18"></div>
                <div class="h-3 bg-surface-container-high rounded w-8"></div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Case Type Table -->
      <div class="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div class="h-5 bg-surface-container-high rounded w-52"></div>
        <!-- Table header -->
        <div class="grid grid-cols-7 gap-2 pb-2 border-b border-outline-variant/50">
          @for (i of [1,2,3,4,5,6,7]; track i) {
            <div class="h-3 bg-surface-container-high rounded"></div>
          }
        </div>
        <!-- Table rows -->
        @for (i of [1,2,3,4,5]; track i) {
          <div class="grid grid-cols-7 gap-2 py-2 border-b border-outline-variant/20">
            @for (j of [1,2,3,4,5,6,7]; track j) {
              <div class="h-4 bg-surface-container-high rounded" [style.width]="j === 1 ? '90%' : '60%'"></div>
            }
          </div>
        }
      </div>

    </div>
  `,
})
export class DashboardStatisticsSkeletonComponent {}

