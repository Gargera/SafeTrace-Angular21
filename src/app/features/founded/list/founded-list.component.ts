import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { FoundedService } from '../services/founded.service';
import { CaseType } from '../../../shared/enums/case-type';
import { Gender } from '../../../shared/enums/gender';
import { FoundPersonListItemDto, FoundedHeaderQueryDTO } from '../models/founded.models';
import { environment } from '../../../../environments/environment';
import { getAgeCategoryTranslationAr } from '../../../core/constants/age.categories.dictionary';

import { CaseHeaderComponent } from '../../../shared/components/cases-components/case-header/case-header.component';
import { CaseFiltersComponent } from '../../../shared/components/cases-components/case-filters/case-filters.component';
import { PaginationComponent } from '../../../shared/components/cases-components/case-pagination/case-pagination.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CaseSkeletonGridComponent } from '../../../shared/components/cases-components/case-skeleton-grid/case-skeleton-grid.component';
import { ButtonComponent } from '../../../shared/components/button/button';
import { CardComponent } from '../../../shared/components/card/card';
import { CasesFilterRequest } from '../../../core/models/Cases.model';

@Component({
  selector: 'app-founded-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    CaseHeaderComponent,
    CaseFiltersComponent,
    PaginationComponent,
    EmptyStateComponent,
    CaseSkeletonGridComponent,
    ButtonComponent,
    CardComponent
  ],
  templateUrl: './founded-list.component.html',
})
export class FoundedListComponent implements OnInit, OnDestroy {
  private readonly foundedService = inject(FoundedService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  public readonly environment = environment;
  public readonly getAgeCategoryTranslationAr = getAgeCategoryTranslationAr;


  // State signals
  items = signal<FoundPersonListItemDto[]>([]);
  totalCount = signal(0);
  currentPage = signal(1);
  pageSize = signal(12);
  isLoading = signal(false);
  hasError = signal(false);

  // Filter state
  searchValue = '';
  selectedGender: Gender | null = null;
  selectedAgeCategory = 0;
  selectedCaseType: CaseType | null = null;

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()));

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilterChange(newFilter: CasesFilterRequest): void {
    this.searchValue = newFilter.fullName || newFilter.caseCode || '';
    this.selectedGender = newFilter.gender !== null && newFilter.gender !== undefined ? newFilter.gender : null;
    const ageCategoryNum = newFilter.ageCategory ? Number(newFilter.ageCategory) : 0;
    this.selectedAgeCategory = isNaN(ageCategoryNum) ? 0 : ageCategoryNum;
    this.selectedCaseType = newFilter.caseType !== null && newFilter.caseType !== undefined ? newFilter.caseType : null;
    
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

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.load();
  }

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
