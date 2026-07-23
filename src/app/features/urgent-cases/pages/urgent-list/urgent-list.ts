import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize, Subject } from 'rxjs';

import { FormField } from '../../../../shared/components/form-field/form-field';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { PaginationComponent } from '../../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { CaseSkeletonGridComponent } from '../../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { CaseCardComponent } from '../../../../shared/components/cases-components/case-card/case-card.component';

import { UrgentCaseService } from '../../services/urgent-case.service';
import { CasesFilterRequest, CaseType } from '../../../../core/models/Cases.model';
import { UrgentCaseListItemResponse } from '../../models/response/UrgentCaseListItemResponse';
import { UrgentCasesFilterRequest } from '../../models/request/UrgentCaseFilterRequest';
import { CaseCreationFlowService } from '../../../../core/services/case-creation-flow.service';
import { CommonModule } from '@angular/common';
import { CasesFilterState } from '../../../../shared/helper/cases-filter-state';

@Component({
  selector: 'app-urgent-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormField,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UrgentListComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly urgentCaseService = inject(UrgentCaseService);
  private readonly caseCreationFlowService = inject(CaseCreationFlowService);
  private readonly destroy$ = new Subject<void>();

  readonly filterState = new CasesFilterState<UrgentCasesFilterRequest>(12, {
    latitude: null,
    longitude: null,
    radiusInMeters: null,
  });

  readonly cases = signal<UrgentCaseListItemResponse[]>([]);
  readonly loading = this.filterState.loading;
  readonly hasError = this.filterState.hasError;

  readonly currentPage = this.filterState.currentPage;
  readonly totalPages = this.filterState.totalPages;
  readonly totalItems = this.filterState.totalItems;
  readonly pageSize = this.filterState.pageSize;

  readonly radiusInMeters = signal<number | null>(null);

  readonly filter = this.filterState.filter;

  ngOnInit(): void {
    this.fetchCases();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateToCreate(): void {
    this.caseCreationFlowService.start(CaseType.Urgent);
  }

  onFilterChange(newFilter: CasesFilterRequest): void {
    this.filterState.onFilterChange(newFilter, () => this.fetchCases(), {
      latitude: this.filter().latitude,
      longitude: this.filter().longitude,
      radiusInMeters: this.filterState.normalizeNumber(this.radiusInMeters()),
    });
  }

  onFilterReset(): void {
    this.radiusInMeters.set(null);
    this.filterState.onFilterReset(() => this.fetchCases(), {
      latitude: null,
      longitude: null,
      radiusInMeters: null,
    });
  }

  onPageChange(page: number): void {
    this.filterState.onPageChange(page, () => this.fetchCases());
  }

  onViewDetails(caseId: number): void {
    this.router.navigate(['/urgent', caseId]);
  }

  onContactReporter(caseId: number): void {
    this.router.navigate(['/urgent', caseId], {
      queryParams: { contact: true },
    });
  }

  trackByCaseId(_index: number, item: UrgentCaseListItemResponse): number {
    return item.id;
  }

  private fetchCases(): void {
    this.loading.set(true);

    this.urgentCaseService
      .getAllCases(this.filter())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ data }) => {
          if (!data) return;

          this.cases.set(data.items);
          this.totalItems.set(data.totalCount);
          this.totalPages.set(data.totalPages);
          this.currentPage.set(data.pageNumber);
          this.pageSize.set(data.pageSize);
        },
      });
  }
}
