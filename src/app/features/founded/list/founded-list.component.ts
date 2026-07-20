import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FoundedService } from '../services/founded.service';
import { CaseType } from '../../../shared/enums/case-type';
import { Gender } from '../../../shared/enums/gender';
import { environment } from '../../../../environments/environment';
import { CaseHeaderComponent } from '../../../shared/components/cases-components/case-header/case-header.component';
import { CaseSkeletonGridComponent } from '../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { CaseFiltersComponent } from '../../../shared/components/cases-components/case-filters/case-filters.component';
import { CasesFilterRequest, CaseListItemResponse } from '../../../core/models/Cases.model';
import { CaseStatus } from '../../../shared/enums/case-status';
import { CaseCardComponent } from '../../../shared/components/cases-components/case-card/case-card.component';
import { FoundedHeaderQueryDTO, FoundPersonListItemDto } from '../models/founded.models';

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
export class FoundedListComponent implements OnInit, OnDestroy {
  private readonly foundedService = inject(FoundedService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  public readonly environment = environment;

  // State signals
  items = signal<FoundPersonListItemDto[]>([]);
  totalCount = signal(0);
  currentPage = signal(1);
  pageSize = signal(12);
  isLoading = signal(false);
  hasError = signal(false);

  // Filter state — updated from app-case-filters output
  private searchValue = '';
  private selectedGender: Gender | null = null;
  private selectedAgeCategory = 0;
  private selectedCaseType: CaseType | null = null;

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()));

  ngOnInit(): void {
    // Initial load is driven by app-case-filters emitting on init
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ----- Filter handlers -----

  onFilterChange(filter: CasesFilterRequest): void {
    this.searchValue = filter.fullName ?? '';
    this.selectedGender = filter.gender !== null ? (filter.gender as unknown as Gender) : null;
    this.selectedAgeCategory = filter.ageCategory !== null ? Number(filter.ageCategory) : 0;
    this.selectedCaseType = filter.caseType;
    this.currentPage.set(1);
    this.load();
  }

  onFilterReset(): void {
    this.searchValue = '';
    this.selectedGender = null;
    this.selectedAgeCategory = 0;
    this.selectedCaseType = null;
    this.currentPage.set(1);
    this.load();
  }

  // ----- Pagination handlers -----

  onPageChange(page: number): void {
    if (page === this.currentPage()) return;
    this.currentPage.set(page);
    this.load();
  }

  retry(): void {
    this.currentPage.set(1);
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
      age: parseInt(person.age) || 0,
      city: '',
      government: '',
      createdAt: person.foundDate,
      mainPhoto: person.mainImage
    };
  }

  // ----- Data loading — unchanged -----

  private load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    const query: FoundedHeaderQueryDTO = {
      search: this.searchValue || undefined,
      gender: this.selectedGender,
      ageCategory: this.selectedAgeCategory || undefined,
      caseType: this.selectedCaseType,
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    this.foundedService
      .getAll(query)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.totalCount.set(res.totalCount);
        },
        error: () => {
          this.hasError.set(true);
        },
      });
  }
}
