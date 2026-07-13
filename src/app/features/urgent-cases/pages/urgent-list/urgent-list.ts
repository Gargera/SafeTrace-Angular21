import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UrgentCaseService } from '../../services/urgent-case.service';
import { CasesFilterRequest } from '../../../../core/models/Cases.model';
import { UrgentCaseListItemResponse } from '../../models/response/UrgentCaseListItemResponse';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { PaginationComponent } from '../../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { EmptyStateComponent } from '../../../../shared/components/cases-components/empty-state/empty-state.component';
import { CaseSkeletonGridComponent } from '../../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { UrgentCasesFilterRequest } from '../../models/request/UrgentCaseFilterRequest';
import { UrgentCaseCardComponent } from '../../components/urgent-case-card/urgent-case-card.component';

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
    UrgentCaseCardComponent,
  ],
  templateUrl: './urgent-list.html',
  styleUrls: ['./urgent-list.css'],
})
export class UrgentListComponent implements OnInit {
  private router = inject(Router);
  private urgentCaseService = inject(UrgentCaseService);

  cases: UrgentCaseListItemResponse[] = [];
  loading = true;

  // app-pagination requires real WritableSignal<number> instances - pass the
  // signal itself down via [currentPage]="currentPage" (no parentheses).
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = 0;
  pageSize = 8;

  // bound via [(ngModel)] on the extendedFilters radius input in urgent-list.html
  radiusInMeters: number | null = null;

  private currentFilter: UrgentCasesFilterRequest = this.emptyFilter();

  ngOnInit(): void {
    this.fetchCases();
  }

  navigateToCreate(): void {
    this.router.navigate(['/cases/urgent/create']);
  }

  onFilterChange(filter: CasesFilterRequest): void {
    this.currentFilter = {
      ...filter,
      latitude: this.currentFilter.latitude,
      longitude: this.currentFilter.longitude,
      radiusInMeters: this.radiusInMeters ?? Number.MAX_VALUE,
      page: 1,
    };
    this.fetchCases();
  }

  onFilterReset(): void {
    this.radiusInMeters = null;
    this.currentFilter = this.emptyFilter();
    this.fetchCases();
  }

  onPageChange(page: number): void {
    this.currentFilter = { ...this.currentFilter, page };
    this.fetchCases();
  }

  onViewDetails(caseId: number): void {
    this.router.navigate(['/cases/urgent', caseId]);
  }

  onContactReporter(caseId: number): void {
    this.router.navigate(['/cases/urgent', caseId], { queryParams: { contact: true } });
  }

  trackByCaseId(_index: number, item: UrgentCaseListItemResponse): number {
    return item.id;
  }

  private fetchCases(): void {
    this.loading = true;
    this.urgentCaseService.getAllCases(this.currentFilter).subscribe({
      next: (apiRes) => {
        const res = apiRes.data;
        this.cases = res.items;
        this.totalItems = res.totalCount;
        this.totalPages.set(res.totalPages);
        this.currentPage.set(this.currentFilter.page);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
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
      latitude: null,
      longitude: null,
      radiusInMeters: Number.MAX_VALUE,
    };
  }
}
