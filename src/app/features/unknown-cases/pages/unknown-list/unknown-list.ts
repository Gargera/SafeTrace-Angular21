import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UnknownCaseService } from '../../services/unknown-case.service';
import { CasesFilterRequest } from '../../../../core/models/Cases.model';
import { UnknownCaseListItemResponse } from '../../models/response/UnknownCaseListItemResponse';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { PaginationComponent } from '../../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { EmptyStateComponent } from '../../../../shared/components/cases-components/empty-state/empty-state.component';
import { CaseSkeletonGridComponent } from '../../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { CaseCardComponent } from '../../../../shared/components/cases-components/case-card/case-card.component';

@Component({
  selector: 'app-unknown-list',
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
  templateUrl: './unknown-list.html',
  styleUrls: ['./unknown-list.css'],
})
export class UnknownList implements OnInit {
  private router = inject(Router);
  private unknownCaseService = inject(UnknownCaseService);
  private cdr = inject(ChangeDetectorRef);

  cases: UnknownCaseListItemResponse[] = [];
  loading = true;

  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = 0;
  pageSize = 8;

  private currentFilter: CasesFilterRequest = this.emptyFilter();

  ngOnInit(): void {
    // The shared filter component emits the initial valid request after it is fully initialized.
  }

  navigateToCreate(): void {
    this.router.navigate(['/cases/unknown/create']);
  }

  onFilterChange(filter: CasesFilterRequest): void {
    this.currentFilter = { ...this.sanitizeFilter(filter), page: 1 };
    this.fetchCases();
  }

  onFilterReset(): void {
    this.currentFilter = this.emptyFilter();
    this.fetchCases();
  }

  onPageChange(page: number): void {
    this.currentFilter = { ...this.currentFilter, page };
    this.fetchCases();
  }

  onViewDetails(caseId: number): void {
    this.router.navigate(['/cases/unknown', caseId]);
  }

  onContactReporter(caseId: number): void {
    this.onViewDetails(caseId);
  }

  trackByCaseId(_index: number, item: UnknownCaseListItemResponse): number {
    return item.id;
  }

  private fetchCases(): void {
    this.loading = true;
    this.unknownCaseService.getAllCases(this.currentFilter as any).subscribe({
      next: (apiRes) => {
        const res = apiRes.data;
        this.cases = res.items;
        this.totalItems = res.totalCount;
        this.totalPages.set(res.totalPages);
        this.currentPage.set(this.currentFilter.page);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
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
    };
  }

  private sanitizeFilter(filter: CasesFilterRequest): CasesFilterRequest {
    return {
      ...filter,
      gender: this.normalizeEnum(filter.gender),
      ageCategory: this.normalizeEnum(filter.ageCategory),
      fullName: this.normalizeText(filter.fullName),
      government: this.normalizeText(filter.government),
      city: this.normalizeText(filter.city),
      minAge: this.normalizeNumber(filter.minAge),
      maxAge: this.normalizeNumber(filter.maxAge),
      fromDate: this.normalizeText(filter.fromDate),
      toDate: this.normalizeText(filter.toDate),
      ageSort: this.normalizeNumber(filter.ageSort),
      dateSort: this.normalizeNumber(filter.dateSort),
      page: 1,
    };
  }

  private normalizeNumber(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) && numericValue !== Number.MAX_VALUE ? numericValue : null;
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
