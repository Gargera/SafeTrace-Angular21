import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { catchError, EMPTY, Subject, switchMap, tap } from 'rxjs';

import { LongTermCaseService } from '../../services/long-term-case.service';
import { CasesFilterRequest } from '../../../../core/models/cases.model';
import { LongTermCaseListItemResponse } from '../../models/response/LongTermCaseListItemResponse';
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
import { CacheService } from '../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';

const UI_STATE_CACHE_KEY = 'LongTermList_UI_State';

@Component({
  selector: 'app-long-term-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HeaderComponent,
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
  private readonly caseCreationFlowService = inject(CaseCreationFlowService);
  private readonly cacheService = inject(CacheService);
  private readonly snackbar = inject(SnackbarService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly fetchTrigger$ = new Subject<void>();

  readonly filterState = new CasesFilterState(12);

  readonly cases = signal<LongTermCaseListItemResponse[]>([]);
  readonly loading = this.filterState.loading;
  readonly hasError = this.filterState.hasError;

  readonly currentPage = this.filterState.currentPage;
  readonly totalPages = this.filterState.totalPages;
  readonly totalItems = this.filterState.totalItems;
  readonly pageSize = this.filterState.pageSize;

  readonly filter = this.filterState.filter;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cacheService.set(
        UI_STATE_CACHE_KEY,
        { filter: this.filter() },
        CACHE_TTL.UI_STATE,
        [CACHE_TAGS.UI_STATE]
      );
    });
  }

  ngOnInit(): void {
    const cachedState = this.cacheService.get<{ filter: CasesFilterRequest }>(UI_STATE_CACHE_KEY);
    if (cachedState) {
      this.filterState.restoreState(cachedState.filter);
    }
    
    this.setupFetchPipeline();
    this.fetchCases();
  }

  navigateToCreate(): void {
    this.caseCreationFlowService.start(CaseType.LongTerm);
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
    this.router.navigate(['/long-term', caseId]);
  }

  onContactReporter(caseId: number): void {
    this.onViewDetails(caseId);
  }

  trackByCaseId(_index: number, item: LongTermCaseListItemResponse): number {
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
          this.longTermCaseService.getAllCases(this.filter()).pipe(
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
      });
  }
}
