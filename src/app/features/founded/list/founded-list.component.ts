import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FoundedService } from '../services/founded.service';
import { CaseType } from '../../../shared/enums/case-type';
import { FoundPersonListItemDto, Gender, FoundedHeaderQueryDTO } from '../models/founded.models';
import { environment } from '../../../../environments/environment';
import { getGenderTranslationAr } from '../../../core/constants/gender.dictionary';
import { CaseHeaderComponent } from '../../../shared/components/cases-components/case-header/case-header.component';
import { CaseSkeletonGridComponent } from '../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { FormField } from '../../../shared/components/form-field/form-field';
import { CardComponent } from '../../../shared/components/card/card';
import { ButtonComponent } from '../../../shared/components/button/button';
@Component({
  selector: 'app-founded-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CaseHeaderComponent, CaseSkeletonGridComponent, EmptyStateComponent, PaginationComponent, FormField, CardComponent, ButtonComponent],
  templateUrl: './founded-list.component.html',
})
export class FoundedListComponent implements OnInit, OnDestroy {
  private readonly foundedService = inject(FoundedService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();
  public readonly environment = environment;

  public getGenderTranslationAr = getGenderTranslationAr;

  // State signals
  items = signal<FoundPersonListItemDto[]>([]);
  totalCount = signal(0);
  currentPage = signal(1);
  pageSize = signal(12);
  isLoading = signal(false);
  hasError = signal(false);

  // Filter state
  searchValue = '';
  selectedGender: Gender | null = null;
  selectedAgeCategory = 0;
  selectedCaseType: CaseType | null = null;

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()));
  pageNumbers = computed(() => {
    const total = this.totalPages();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const current = this.currentPage();
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++)
      pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.load();
      });
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchSubject.next(value);
  }

  onGenderChange(value: string): void {
    this.selectedGender = value === '' ? null : (parseInt(value) as Gender);
    this.currentPage.set(1);
    this.load();
  }

  onAgeCategoryChange(value: string): void {
    this.selectedAgeCategory = parseInt(value) || 0;
    this.currentPage.set(1);
    this.load();
  }

  onCaseTypeChange(value: string): void {
    this.selectedCaseType = value === '' ? null : (value as CaseType);
    this.currentPage.set(1);
    this.load();
  }

  goToPage(page: number | '...'): void {
    if (page === '...' || page === this.currentPage()) return;
    this.currentPage.set(page as number);
    this.load();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.load();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.load();
    }
  }

  goToDetail(id: number): void {
    this.router.navigate(['/founded', id]);
  }

  onPageChange(page: number): void {
    this.goToPage(page);
  }

  resetFilters(): void {
    this.searchValue = '';
    this.selectedGender = null;
    this.selectedAgeCategory = 0;
    this.selectedCaseType = null;
    this.currentPage.set(1);
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    const query: FoundedHeaderQueryDTO = {
      search: this.searchValue || undefined,
      gender: this.selectedGender,
      ageCategory: this.selectedAgeCategory,
      caseType: this.selectedCaseType,
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    this.foundedService
      .getAll(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          console.log('Total Count:', res); // Debugging line
          this.totalCount.set(res.totalCount);
          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
  }
}
