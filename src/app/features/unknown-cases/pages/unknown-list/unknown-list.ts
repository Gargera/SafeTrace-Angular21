import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { UnknownCaseService } from '../../services/unknown-case.service';
import { CasesFilterRequest, CaseType } from '../../../../core/models/Cases.model';
import { UnknownCaseListItemResponse } from '../../models/response/UnknownCaseListItemResponse';
import { CaseCreationFlowService } from '../../../../core/services/case-creation-flow.service';

import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { PaginationComponent } from '../../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { CaseSkeletonGridComponent } from '../../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { CaseCardComponent } from '../../../../shared/components/cases-components/case-card/case-card.component';
import { CasesFilterState } from '../../../../shared/helper/cases-filter-state';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnknownList implements OnInit {
  private readonly router = inject(Router);
  private readonly unknownCaseService = inject(UnknownCaseService);
  private readonly caseCreationFlowService = inject(CaseCreationFlowService);

  readonly filterState = new CasesFilterState(12);

  readonly cases = signal<UnknownCaseListItemResponse[]>([]);
  readonly loading = this.filterState.loading;

  readonly currentPage = this.filterState.currentPage;
  readonly totalPages = this.filterState.totalPages;
  readonly totalItems = this.filterState.totalItems;
  readonly pageSize = this.filterState.pageSize;

  readonly filter = this.filterState.filter;

  ngOnInit(): void {
    this.fetchCases();
  }

  navigateToCreate(): void {
    this.caseCreationFlowService.start(CaseType.Unknown);
  }

  onFilterChange(newFilter: CasesFilterRequest): void {
    this.filterState.onFilterChange(newFilter, () => this.fetchCases());
  }

  onFilterReset(): void {
    this.filterState.onFilterReset(() => this.fetchCases());
  }

  onPageChange(page: number): void {
    this.filterState.onPageChange(page, () => this.fetchCases());
  }

  onViewDetails(caseId: number): void {
    this.router.navigate(['/unknown', caseId]);
  }

  onContactReporter(caseId: number): void {
    this.onViewDetails(caseId);
  }

  trackByCaseId(_index: number, item: UnknownCaseListItemResponse): number {
    return item.id;
  }

  private fetchCases(): void {
    this.loading.set(true);

    this.unknownCaseService
      .getAllCases(this.filter() as any)
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
