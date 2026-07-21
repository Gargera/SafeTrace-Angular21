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

  private readonly defaultPageSize = 12;

  readonly cases = signal<UrgentCaseListItemResponse[]>([]);
  readonly loading = signal(true);
  readonly hasError = signal(false);

  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly totalItems = signal(0);
  readonly pageSize = signal(this.defaultPageSize);

  readonly radiusInKm = signal<number | null>(null);
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);

  readonly filter = signal<UrgentCasesFilterRequest>(this.emptyFilter());

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
    this.filter.update((f) => ({
      ...this.sanitizeFilter(newFilter),
      latitude: this.normalizeNumber(this.latitude()),
      longitude: this.normalizeNumber(this.longitude()),
      radiusInMeters: this.normalizeRadius(this.radiusInKm()) !== null ? this.normalizeRadius(this.radiusInKm())! * 1000 : null,
      page: 1,
      pageSize: this.pageSize(),
    }));

    this.fetchCases();
  }

  onFilterReset(): void {
    this.radiusInKm.set(null);
    this.latitude.set(null);
    this.longitude.set(null);

    this.filter.set({
      ...this.emptyFilter(),
      pageSize: this.pageSize(),
    });

    this.fetchCases();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);

    this.filter.update((f) => ({
      ...f,
      page,
    }));

    this.fetchCases();
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

  private emptyFilter(): UrgentCasesFilterRequest {
    return {
      status: null,
      caseType: null,
      caseCode: null,
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
      pageSize: this.defaultPageSize,
      latitude: null,
      longitude: null,
      radiusInMeters: null,
    };
  }

  private sanitizeFilter(filter: CasesFilterRequest): CasesFilterRequest {
    return {
      ...filter,
      caseType: this.normalizeEnum(filter.caseType),
      caseCode: this.normalizeText(filter.caseCode),
      gender: this.normalizeEnum(filter.gender),
      ageCategory: this.normalizeEnum(filter.ageCategory),
      fullName: this.normalizeText(filter.fullName),
      government: this.normalizeText(filter.government),
      city: this.normalizeText(filter.city),
      minAge: this.normalizeNumber(filter.minAge),
      maxAge: this.normalizeNumber(filter.maxAge),
      fromDate: this.normalizeText(filter.fromDate),
      toDate: this.normalizeText(filter.toDate),
      ageSort: this.normalizeNumber(filter.ageSort),
      dateSort: this.normalizeNumber(filter.dateSort),
      page: 1,
      pageSize: this.pageSize(),
    };
  }

  private normalizeNumber(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const numericValue = typeof value === 'number' ? value : Number(value);

    return Number.isFinite(numericValue) && numericValue !== Number.MAX_VALUE ? numericValue : null;
  }

  private normalizeEnum<T>(value: T | null | undefined): T | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0 ? value : null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) && value !== Number.MAX_VALUE ? value : null;
    }

    return value;
  }

  private normalizeText(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const textValue = value.trim();

    return textValue.length > 0 ? textValue : null;
  }

  private normalizeRadius(value: number | null | undefined): number | null {
    return this.normalizeNumber(value);
  }
}
