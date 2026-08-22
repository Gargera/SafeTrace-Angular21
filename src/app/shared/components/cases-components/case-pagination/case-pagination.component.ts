import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import { ButtonComponent } from '../../button/button';
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './case-pagination.component.html',
})

export class PaginationComponent {
  currentPage = input.required<number>();
  totalPages = input.required<number>();

  totalItems = input<number | null>(null);
  pageSize = input<number | null>(null);
  loading = input(false);
  pendingPage = signal<number | null>(null);

  pageChange = output<number>();

  constructor() {
    effect(() => {
      if (!this.loading()) this.pendingPage.set(null);
    });
  }

  readonly pageNumbers = computed(() => {
    const current = this.currentPage();
    const total = this.totalPages();

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];

    pages.push(1);

    if (current > 3) {
      pages.push('...');
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push('...');
    }

    pages.push(total);

    return pages;
  });

  readonly startItem = computed(() => {
    const total = this.totalItems();
    const size = this.pageSize();
    if (!total || !size) return 0;
    return (this.currentPage() - 1) * size + 1;
  });

  readonly endItem = computed(() => {
    const total = this.totalItems();
    const size = this.pageSize();
    if (!total || !size) return 0;
    return Math.min(this.currentPage() * size, total);
  });

  firstPage(): void {
    this.requestPage(1);
  }

  lastPage(): void {
    this.requestPage(this.totalPages());
  }

  nextPage(): void {
    this.requestPage(this.currentPage() + 1);
  }

  prevPage(): void {
    this.requestPage(this.currentPage() - 1);
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number') this.requestPage(page);
  }

  private requestPage(page: number): void {
    if (this.loading() || page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.pendingPage.set(page);
    this.pageChange.emit(page);
  }
}
