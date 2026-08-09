import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [ngClass]="getContainerClass()">
      @for (item of itemsArray; track $index) {
        
        <!-- case-card-compact -->
        @if (layout() === 'case-card-compact') {
          <div dir="rtl" class="flex flex-col sm:flex-row overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-lowest shadow-sm">
            <div class="shrink-0 p-3 flex items-center justify-center bg-surface-container-lowest">
              <div class="relative w-20 h-20 sm:w-24 sm:h-24 overflow-hidden rounded-xl border border-outline-variant/30 shadow-sm bg-surface-container-high"></div>
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-between p-3">
              <div class="flex items-start justify-between gap-2 pb-1.5">
                <div class="space-y-2 min-w-0">
                  <div class="h-4 bg-surface-container-high rounded w-32"></div>
                  <div class="h-3 bg-surface-container-high rounded w-16"></div>
                </div>
                <div class="h-4 bg-surface-container-high rounded w-16"></div>
              </div>
              <div class="flex items-center justify-between gap-2 mt-3 pt-2">
                <div class="flex items-center gap-1.5">
                  <div class="h-5 bg-surface-container-high rounded w-12"></div>
                  <div class="h-5 bg-surface-container-high rounded w-12"></div>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="h-7 bg-surface-container-high rounded-lg min-w-[70px]"></div>
                  <div class="h-7 bg-surface-container-high rounded-lg min-w-[70px]"></div>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- case-card (or grid) -->
        @if (layout() === 'case-card' || layout() === 'grid') {
          <div dir="rtl" class="flex h-full flex-col overflow-hidden rounded-2xl border border-outline-variant/70 bg-surface-container-lowest shadow-sm">
            <div class="relative aspect-4/3 overflow-hidden rounded-t-2xl bg-surface-container-high"></div>
            <div class="flex flex-1 flex-col p-5">
              <div class="h-5 bg-surface-container-high rounded w-3/4 mb-4"></div>
              <div class="space-y-3 mb-4">
                <div class="flex justify-between items-center"><div class="h-3 bg-surface-container-high rounded w-1/4"></div><div class="h-3 bg-surface-container-high rounded w-1/4"></div></div>
                <div class="flex justify-between items-center"><div class="h-3 bg-surface-container-high rounded w-1/4"></div><div class="h-3 bg-surface-container-high rounded w-1/4"></div></div>
                <div class="flex justify-between items-center"><div class="h-3 bg-surface-container-high rounded w-1/4"></div><div class="h-3 bg-surface-container-high rounded w-1/4"></div></div>
              </div>
              <div class="mt-auto pt-4 border-t border-outline-variant/50 flex flex-wrap gap-2">
                <div class="h-10 bg-surface-container-high rounded-xl flex-1"></div>
                <div class="h-10 w-10 bg-surface-container-high rounded-xl"></div>
                <div class="h-10 w-10 bg-surface-container-high rounded-xl"></div>
              </div>
            </div>
          </div>
        }

        <!-- chat-list (or list) -->
        @if (layout() === 'chat-list' || layout() === 'list') {
          <div dir="rtl" class="w-full flex items-center gap-sm bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-sm">
            <div class="w-10 h-10 rounded-full bg-surface-container-high shrink-0"></div>
            <div class="flex-1 min-w-0 flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <div class="h-4 bg-surface-container-high rounded-full w-20"></div>
                <div class="h-4 bg-surface-container-high rounded w-32"></div>
              </div>
              <div class="h-3 bg-surface-container-high rounded w-2/3"></div>
            </div>
            <div class="flex flex-col items-end gap-2 shrink-0">
              <div class="h-3 bg-surface-container-high rounded w-12"></div>
              <div class="h-5 w-5 rounded-full bg-surface-container-high"></div>
            </div>
            <div class="h-5 w-5 bg-surface-container-high rounded mr-2 shrink-0"></div>
          </div>
        }
      }
    </div>
  `,
})
export class CardSkeletonComponent {
  readonly items = input<number>(8);
  readonly layout = input<'grid' | 'list' | 'case-card-compact' | 'case-card' | 'chat-list'>('grid');

  get itemsArray(): number[] {
    return Array.from({ length: this.items() }, (_, i) => i);
  }

  getContainerClass(): string {
    if (this.layout() === 'case-card-compact') return 'flex flex-col gap-4 w-full animate-pulse';
    if (this.layout() === 'chat-list' || this.layout() === 'list') return 'flex flex-col gap-2 w-full animate-pulse';
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full animate-pulse';
  }
}
