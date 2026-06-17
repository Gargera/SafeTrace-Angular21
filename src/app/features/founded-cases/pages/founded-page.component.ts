import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import { FoundedPerson, FoundedFilter, AGE_CATEGORIES } from '../models/founded-model';
import { FoundedService } from '../service/founded.service';
import { FoundedCardComponent } from '../components/founded-card/founded-card.component';

@Component({
  selector: 'app-founded-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FoundedCardComponent],
  templateUrl: './founded-page.component.html',
})
export class FoundedListComponent implements OnInit, OnDestroy {
  persons: FoundedPerson[] = [];
  isLoading = false;
  hasError = false;
  totalPages = 1;

  filter: FoundedFilter = {
    search: '',
    ageCategory: 0,
    gender: '',
    page: 1,
    pageSize: 12,
  };

  readonly ageCategories = AGE_CATEGORIES;

  private destroy$ = new Subject<void>();
  private searchTimeout?: number;
  private filterChanges$ = new Subject<void>();

  constructor(private foundedService: FoundedService) {}

  ngOnInit(): void {
    // Subscribe to debounced filter changes and load data
    this.filterChanges$
      .pipe(
        debounceTime(200),
        switchMap(() => {
          this.isLoading = true;
          this.hasError = false;
          return this.foundedService.getFoundedPersons(this.filter);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res) => {
          console.log('✅ API raw response:', res);

          if (Array.isArray(res.data)) {
            this.persons = res.data;
          } else if (res.data && typeof res.data === 'object') {
            const nested = res.data as any;
            this.persons = nested.items ?? nested.data ?? [];
            if (nested.totalPages) this.totalPages = nested.totalPages;
          } else {
            this.persons = [];
          }

          console.log('👤 Persons loaded:', this.persons.length, this.persons);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('❌ API error:', err);
          this.hasError = true;
          this.isLoading = false;
        },
      });

    // initial load
    this.filterChanges$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.clearTimeout(this.searchTimeout);
  }

  // Emit a filter change to trigger a (debounced) load
  loadPersons(): void {
    this.filterChanges$.next();
  }

  onSearchChange(value: string): void {
    this.filter.search = value;
    this.filter.page = 1;
    window.clearTimeout(this.searchTimeout);
    this.searchTimeout = window.setTimeout(() => this.loadPersons(), 350);
  }

  onFilterChange(): void {
    this.filter.page = 1;
    this.loadPersons();
  }

  prevPage(): void {
    if (this.filter.page > 1) {
      this.filter.page--;
      this.loadPersons();
    }
  }

  nextPage(): void {
    this.filter.page++;
    this.loadPersons();
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    this.filter.page = page;
    this.loadPersons();
  }
}
