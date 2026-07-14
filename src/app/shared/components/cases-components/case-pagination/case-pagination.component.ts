import {
  Component,
  computed,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [],
  templateUrl: './case-pagination.component.html',
  styleUrls: ['./case-pagination.component.css'],
})

export class PaginationComponent {
  @Input({ required: true }) currentPage = signal(1);
  @Input({ required: true }) totalPages = signal(1);

  /** Optional: pass both to show a "showing X-Y of Z" summary above the buttons. */
  @Input() totalItems: number | null = null;
  @Input() pageSize: number | null = null;

  @Output() pageChange = new EventEmitter<number>();

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
    if (!this.totalItems || !this.pageSize) return 0;
    return (this.currentPage() - 1) * this.pageSize + 1;
  });

  readonly endItem = computed(() => {
    if (!this.totalItems || !this.pageSize) return 0;
    return Math.min(this.currentPage() * this.pageSize, this.totalItems);
  });

  firstPage(): void {
    if (this.currentPage() !== 1) {
      this.pageChange.emit(1);
    }
  }

  lastPage(): void {
    if (this.currentPage() !== this.totalPages()) {
      this.pageChange.emit(this.totalPages());
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.pageChange.emit(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.pageChange.emit(this.currentPage() - 1);
    }
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number' && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }
}