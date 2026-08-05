import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, EMPTY, Subject, switchMap, tap } from 'rxjs';

import { UnknownCaseService } from '../../services/unknown-case.service';
import { CasesFilterRequest } from '../../../../core/models/cases.model';
import { UnknownCaseListItemResponse } from '../../models/response/UnknownCaseListItemResponse';
import { CaseCreationFlowService } from '../../../../core/services/case-creation-flow.service';

import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { PaginationComponent } from '../../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { CaseSkeletonGridComponent } from '../../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { CaseCardComponent } from '../../../../shared/components/cases-components/case-card/case-card.component';
import { CasesFilterState } from '../../../../shared/helper/cases-filter-state';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { extractErrorMessage } from '../../../../shared/helper/case-error.helper';
import { CaseType } from '../../../../shared/enums/case-type';

@Component({
  selector: 'app-unknown-list',
  standalone: true,
  imports: [
    FormsModule,
    HeaderComponent,
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
  private readonly snackbar = inject(SnackbarService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly fetchTrigger$ = new Subject<void>();

  readonly filterState = new CasesFilterState(12);

  readonly cases = signal<UnknownCaseListItemResponse[]>([]);
  readonly loading = this.filterState.loading;
  readonly hasError = this.filterState.hasError;

  readonly currentPage = this.filterState.currentPage;
  readonly totalPages = this.filterState.totalPages;
  readonly totalItems = this.filterState.totalItems;
  readonly pageSize = this.filterState.pageSize;

  readonly filter = this.filterState.filter;

  ngOnInit(): void {
    this.setupFetchPipeline();
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
    this.fetchTrigger$.next();
  }

  private setupFetchPipeline(): void {
    this.fetchTrigger$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.hasError.set(false);
        }),
        switchMap(() =>
          this.unknownCaseService.getAllCases(this.filter()).pipe(
            catchError((err: unknown) => {
              this.loading.set(false);
              this.hasError.set(true);
              const errorMessage = extractErrorMessage(err, 'حدث خطأ أثناء تحميل البيانات');
              this.snackbar.error(errorMessage);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data }) => {
          this.loading.set(false);
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
