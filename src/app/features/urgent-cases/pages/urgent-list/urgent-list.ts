import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { catchError, EMPTY, Subject, switchMap, tap } from 'rxjs';

import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import { CaseFiltersComponent } from '../../../../shared/components/cases-components/case-filters/case-filters.component';
import { PaginationComponent } from '../../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { CaseSkeletonGridComponent } from '../../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { CaseCardComponent } from '../../../../shared/components/cases-components/case-card/case-card.component';

import { UrgentCaseService } from '../../services/urgent-case.service';
import { CasesFilterRequest } from '../../../../core/models/cases.model';
import { UrgentCaseListItemResponse } from '../../models/response/UrgentCaseListItemResponse';
import { UrgentCasesFilterRequest } from '../../models/request/UrgentCaseFilterRequest';
import { CaseCreationFlowService } from '../../../../core/services/case-creation-flow.service';
import { CommonModule } from '@angular/common';
import { CasesFilterState } from '../../../../shared/helper/cases-filter-state';
import { SnackbarService } from '../../../../core/services/toast.service';
import { extractErrorMessage } from '../../../../shared/helper/case-error.helper';
import { CaseType } from '../../../../shared/enums/case-type';

@Component({
  selector: 'app-urgent-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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
export class UrgentListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly urgentCaseService = inject(UrgentCaseService);
  private readonly caseCreationFlowService = inject(CaseCreationFlowService);
  private readonly snackbar = inject(SnackbarService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly fetchTrigger$ = new Subject<void>();

  readonly filterState = new CasesFilterState<UrgentCasesFilterRequest>(12, {
    latitude: null,
    longitude: null,
    radiusInKm: null,
  });

  readonly cases = signal<UrgentCaseListItemResponse[]>([]);
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
    this.caseCreationFlowService.start(CaseType.Urgent);
  }

  onFilterChange(newFilter: CasesFilterRequest): void {
    const urgentFilter = newFilter as UrgentCasesFilterRequest;

    if (urgentFilter.radiusInKm && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.filterState.onFilterChange(newFilter, () => this.fetchCases(), {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radiusInKm: urgentFilter.radiusInKm,
          });
        },
        () => {
          this.filterState.onFilterChange(newFilter, () => this.fetchCases(), {
            latitude: this.filter().latitude,
            longitude: this.filter().longitude,
            radiusInKm: urgentFilter.radiusInKm,
          });
        }
      );
    } else {
      this.filterState.onFilterChange(newFilter, () => this.fetchCases(), {
        latitude: urgentFilter.radiusInKm ? this.filter().latitude : null,
        longitude: urgentFilter.radiusInKm ? this.filter().longitude : null,
        radiusInKm: urgentFilter.radiusInKm ?? null,
      });
    }
  }

  onFilterReset(): void {
    this.filterState.onFilterReset(() => this.fetchCases(), {
      latitude: null,
      longitude: null,
      radiusInKm: null,
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
          this.urgentCaseService.getAllCases(this.filter()).pipe(
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
