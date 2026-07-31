import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { catchError, EMPTY, Subject, switchMap, tap } from 'rxjs';
import { FoundedService } from '../services/founded.service';
import { CaseType } from '../../../shared/enums/case-type';
import { Gender } from '../../../shared/enums/gender';
import { environment } from '../../../../environments/environment';
import { CaseHeaderComponent } from '../../../shared/components/cases-components/case-header/case-header.component';
import { CaseSkeletonGridComponent } from '../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { CaseFiltersComponent } from '../../../shared/components/cases-components/case-filters/case-filters.component';
import { CasesFilterRequest, CaseListItemResponse } from '../../../core/models/cases.model';
import { CaseStatus } from '../../../shared/enums/case-status';
import { CaseCardComponent } from '../../../shared/components/cases-components/case-card/case-card.component';
import { FoundedHeaderQueryDTO, FoundPersonListItemDto } from '../models/founded.models';
import { FoundedFilterState } from '../../../shared/helper/cases-filter-state';
import { SnackbarService } from '../../../shared/services/toast.service';
import { extractErrorMessage } from '../../../shared/helper/case-error.helper';

@Component({
  selector: 'app-founded-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CaseHeaderComponent,
    CaseSkeletonGridComponent,
    EmptyStateComponent,
    PaginationComponent,
    CaseFiltersComponent,
    CaseCardComponent,
  ],
  templateUrl: './founded-list.component.html',
})
export class FoundedListComponent implements OnInit {
  private readonly foundedService = inject(FoundedService);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);
  private readonly destroyRef = inject(DestroyRef);
  public readonly environment = environment;

  private readonly loadTrigger$ = new Subject<void>();

  readonly filterState = new FoundedFilterState(12);

  // State signals
  items = signal<FoundPersonListItemDto[]>([]);
  totalCount = this.filterState.totalItems;
  currentPage = this.filterState.currentPage;
  pageSize = this.filterState.pageSize;
  isLoading = this.filterState.loading;
  hasError = this.filterState.hasError;

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()));

  ngOnInit(): void {
    this.setupLoadPipeline();
    this.load();
  }

  // ----- Filter handlers -----

  onFilterChange(newFilter: CasesFilterRequest): void {
    this.filterState.onFilterChange(newFilter, () => this.load());
  }

  onFilterReset(): void {
    this.filterState.onFilterReset(() => this.load());
  }

  // ----- Pagination handlers -----

  onPageChange(page: number): void {
    this.filterState.onPageChange(page, () => this.load());
  }

  retry(): void {
    this.filterState.currentPage.set(1);
    this.load();
  }

  // ----- Navigation -----

  goToDetail(id: number): void {
    this.router.navigate(['/founded', id]);
  }

  mapToCaseItem(person: FoundPersonListItemDto): CaseListItemResponse {
    return {
      id: person.id,
      caseCode: '',
      caseType: CaseType.Unknown,
      status: CaseStatus.Found,
      fName: person.fullName,
      sName: null,
      tName: null,
      lName: null,
      gender: Gender.Male,
      age: person.age,
      city: '',
      government: '',
      createdAt: person.foundDate,
      mainPhoto: person.mainImage,
    };
  }

  // ----- Data loading -----

  private load(): void {
    this.loadTrigger$.next();
  }

  private setupLoadPipeline(): void {
    this.loadTrigger$
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.hasError.set(false);
        }),
        switchMap(() => {
          const f = this.filterState.filter();

          const query: FoundedHeaderQueryDTO = {
            search: f.fullName || f.caseCode || undefined,
            gender: f.gender,
            minAge: f.minAge ?? undefined,
            maxAge: f.maxAge ?? undefined,
            caseType: f.caseType,
            page: this.currentPage(),
            pageSize: this.pageSize(),
          };

          return this.foundedService.getAll(query).pipe(
            catchError((err: unknown) => {
              this.hasError.set(true);
              this.isLoading.set(false);
              const errorMessage = extractErrorMessage(err, 'حدث خطأ أثناء تحميل البيانات');
              this.snackbar.error(errorMessage);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.totalCount.set(res.totalCount);
          this.isLoading.set(false);
        },
      });
  }
}
