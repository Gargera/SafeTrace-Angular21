import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './pagination.html'
})
export class PaginationComponent {
  currentPage = input.required<number>();
  totalPages = input.required<number>();
  loading = input(false);
  pendingPage = signal<number | null>(null);
  
  pageChange = output<number>();

  constructor() {
    effect(() => {
      if (!this.loading()) this.pendingPage.set(null);
    });
  }

  pagesArray = computed(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: (number | string)[] = [];
    
    if (total <= 0) return pages;

    let start = Math.max(1, current - 1);
    let end = Math.min(total, current + 1);

    if (end - start < 2) {
      if (start === 1) {
        end = Math.min(total, 3);
      } else if (end === total) {
        start = Math.max(1, total - 2);
      }
    }

    if (start > 1) {
      pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < total) {
      pages.push('...');
    }

    return pages;
  });

  changePage(page: number | string) {
    if (!this.loading() && typeof page === 'number' && page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pendingPage.set(page);
      this.pageChange.emit(page);
    }
  }
}
