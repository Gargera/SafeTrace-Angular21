import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FoundedService } from '../../services/founded.service';
import { CasesFilterRequest } from '../../../../core/models/Cases.model';
import { CaseListItemResponse } from '../../../../core/models/Cases.model';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { PaginationComponent } from '../../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { EmptyStateComponent } from '../../../../shared/components/cases-components/empty-state/empty-state.component';
import { CaseSkeletonGridComponent } from '../../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { CaseCardComponent } from '../../../../shared/components/cases-components/case-card/case-card.component';
import { FoundedHeaderQueryDTO } from '../../models/founded.models';

@Component({
  selector: 'app-founded-list',
  standalone: true,
  imports: [
    FormsModule,
    CaseHeaderComponent,
    CaseFiltersComponent,
    PaginationComponent,
    CaseSkeletonGridComponent,
    EmptyStateComponent,
    CaseCardComponent,
  ],
  templateUrl: './founded-list.html',
})
export class FoundedList implements OnInit {
  private router = inject(Router);
  private foundedService = inject(FoundedService);

  cases = signal<CaseListItemResponse[]>([]);
  loading = signal(true);

  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  pageSize = signal(8);

  filter = signal<CasesFilterRequest>(this.emptyFilter());

  ngOnInit(): void {
    this.fetchCases();
  }

  onFilterChange(newFilter: CasesFilterRequest): void {
    this.filter.update((f) => ({
      ...this.sanitizeFilter(newFilter),
      page: 1,
    }));
    this.fetchCases();
  }

  onFilterReset(): void {
    this.filter.set(this.emptyFilter());
    this.fetchCases();
  }

  onPageChange(page: number): void {
    this.filter.update((f) => ({ ...f, page }));
    this.fetchCases();
  }

  onViewDetails(caseId: number): void {
    this.router.navigate(['/founded', caseId]);
  }

  trackByCaseId(_index: number, item: CaseListItemResponse): number {
    return item.id;
  }

  private fetchCases(): void {
    this.loading.set(true);
    
    // Convert CasesFilterRequest to FoundedHeaderQueryDTO
    const currentFilter = this.filter();
    const query: FoundedHeaderQueryDTO = {
      search: currentFilter.fullName || undefined,
      gender: currentFilter.gender !== null ? currentFilter.gender : undefined,
      ageCategory: currentFilter.ageCategory !== null ? currentFilter.ageCategory : undefined,
      page: currentFilter.page,
      pageSize: currentFilter.pageSize,
    };

    this.foundedService.getAll(query).subscribe({
      next: (res) => {
        if (res) {
          this.cases.set(res.items);
          this.totalItems.set(res.totalCount);
          this.totalPages.set(res.totalPages);
          this.currentPage.set(this.filter().page);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private emptyFilter(): CasesFilterRequest {
    return {
      status: null,
      gender: null,
      ageCategory: null,
      fullName: null,
      government: null,
      city: null,
      minAge: null,
      maxAge: null,
      fromDate: null,
      toDate: null,
      ageSort: null,
      dateSort: null,
      page: 1,
      pageSize: 12,
    };
  }

  private sanitizeFilter(filter: CasesFilterRequest): CasesFilterRequest {
    return {
      ...filter,
      gender: this.normalizeEnum(filter.gender),
      ageCategory: this.normalizeEnum(filter.ageCategory),
      fullName: this.normalizeText(filter.fullName),
      page: 1,
    };
  }

  private normalizeEnum<T>(value: T | null | undefined): T | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0 ? value : null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) && value !== Number.MAX_VALUE ? value : null;
    }

    return value;
  }

  private normalizeText(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const textValue = String(value).trim();
    return textValue.length > 0 ? textValue : null;
  }
}

