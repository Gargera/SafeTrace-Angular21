import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UrgentCaseService } from '../../services/urgent-case.service';
import { CasesFilterRequest } from '../../../../core/models/Cases.model';
import { UrgentCaseListItemResponse } from '../../models/response/UrgentCaseListItemResponse';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { PaginationComponent } from '../../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { CaseSkeletonGridComponent } from '../../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { UrgentCasesFilterRequest } from '../../models/request/UrgentCaseFilterRequest';
import { CaseCardComponent } from '../../../../shared/components/cases-components/case-card/case-card.component';

@Component({
  selector: 'app-urgent-list',
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
  templateUrl: './urgent-list.html',
  styleUrls: ['./urgent-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UrgentListComponent implements OnInit {
  private router = inject(Router);
  private urgentCaseService = inject(UrgentCaseService);

  cases = signal<UrgentCaseListItemResponse[]>([]);
  loading = signal(true);

  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  pageSize = signal(8);

  radiusInMeters = signal<number | null>(null);

  filter = signal<UrgentCasesFilterRequest>(this.emptyFilter());

  ngOnInit(): void {
    this.fetchCases();
  }

  navigateToCreate(): void {
    this.router.navigate(['/urgent/create']);
  }

  onFilterChange(newFilter: CasesFilterRequest): void {
    this.filter.update((f) => ({
      ...this.sanitizeFilter(newFilter),
      latitude: f.latitude,
      longitude: f.longitude,
      radiusInMeters: this.normalizeRadius(this.radiusInMeters()),
      page: 1,
    }));
    this.fetchCases();
  }

  onFilterReset(): void {
    this.radiusInMeters.set(null);
    this.filter.set(this.emptyFilter());
    this.fetchCases();
  }

  onPageChange(page: number): void {
    this.filter.update((f) => ({ ...f, page }));
    this.fetchCases();
  }

  onViewDetails(caseId: number): void {
    this.router.navigate(['/urgent', caseId]);
  }

  onContactReporter(caseId: number): void {
    this.router.navigate(['/urgent', caseId], { queryParams: { contact: true } });
  }

  trackByCaseId(_index: number, item: UrgentCaseListItemResponse): number {
    return item.id;
  }

  private fetchCases(): void {
    this.loading.set(true);
    this.urgentCaseService.getAllCases(this.filter()).subscribe({
      next: (apiRes) => {
        const res = apiRes.data;
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

  private emptyFilter(): UrgentCasesFilterRequest {
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
      latitude: null,
      longitude: null,
      radiusInMeters: null,
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

  private normalizeRadius(value: number | null | undefined): number | null {
    return this.normalizeNumber(value);
  }
}
