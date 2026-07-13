import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
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
    DatePipe,
  ],
  templateUrl: './unknown-list.html',
  styleUrls: ['./unknown-list.css'],
})
export class UnknownList implements OnInit {
  private router = inject(Router);
  private unknownCaseService = inject(UnknownCaseService);

  cases: UnknownCaseListItemResponse[] = [];
  loading = true;

  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = 0;
  pageSize = 8;

  private currentFilter: CasesFilterRequest = this.emptyFilter();

  ngOnInit(): void {
    this.fetchCases();
  }

  navigateToCreate(): void {
    this.router.navigate(['/cases/unknown/create']);
  }

  onFilterChange(filter: CasesFilterRequest): void {
    this.currentFilter = { ...filter, page: 1 };
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
      },
      error: () => (this.loading = false),
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
}
