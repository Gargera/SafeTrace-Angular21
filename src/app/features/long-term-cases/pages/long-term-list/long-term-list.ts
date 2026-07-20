import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { LongTermCaseService } from '../../services/long-term-case.service';
import { CasesFilterRequest } from '../../../../core/models/Cases.model';
import { LongTermCaseListItemResponse } from '../../models/response/LongTermCaseListItemResponse';

import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { PaginationComponent } from '../../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { CaseSkeletonGridComponent } from '../../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { CaseCardComponent } from '../../../../shared/components/cases-components/case-card/case-card.component';

@Component({
  selector: 'app-long-term-list',
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
  templateUrl: './long-term-list.html',
  styleUrls: ['./long-term-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LongTermList implements OnInit {
  private readonly router = inject(Router);
  private readonly longTermCaseService = inject(LongTermCaseService);

  readonly cases = signal<LongTermCaseListItemResponse[]>([]);
  readonly loading = signal(true);

  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly totalItems = signal(0);
  readonly pageSize = signal(12);

  readonly filter = signal<CasesFilterRequest>(this.emptyFilter());

  ngOnInit(): void {
    this.fetchCases();
  }

  navigateToCreate(): void {
    this.router.navigate(['/long-term/create']);
  }

  onFilterChange(newFilter: CasesFilterRequest): void {
    this.filter.update(() => ({
      ...this.sanitizeFilter(newFilter),
      page: 1,
      pageSize: this.pageSize(),
    }));

    this.fetchCases();
  }

  onFilterReset(): void {
    this.filter.set(this.emptyFilter());
    this.fetchCases();
  }

  onPageChange(page: number): void {
    this.filter.update((f) => ({
      ...f,
      page,
      pageSize: this.pageSize(),
    }));

    this.fetchCases();
  }

  onViewDetails(caseId: number): void {
    this.router.navigate(['/long-term', caseId]);
  }

  onContactReporter(caseId: number): void {
    this.onViewDetails(caseId);
  }

  trackByCaseId(_index: number, item: LongTermCaseListItemResponse): number {
    return item.id;
  }

  private fetchCases(): void {
    this.loading.set(true);

    this.longTermCaseService.getAllCases(this.filter()).subscribe({
      next: (apiRes) => {
        const res = apiRes.data;

        if (res) {
          this.cases.set(res.items);
          this.totalItems.set(res.totalCount);
          this.totalPages.set(res.totalPages);
          this.currentPage.set(res.pageNumber);
          this.pageSize.set(res.pageSize);
        }

        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private emptyFilter(): CasesFilterRequest {
    return {
      status: null,
      caseType: null,
      caseCode: null,
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
      pageSize: this.pageSize(),
    };
  }

  private sanitizeFilter(filter: CasesFilterRequest): CasesFilterRequest {
    return {
      ...filter,
      caseType: this.normalizeEnum(filter.caseType),
      caseCode: this.normalizeText(filter.caseCode),
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
      pageSize: this.pageSize(),
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
