import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CaseType } from '../enums/case-type';
import { CaseStatus } from '../enums/case-status';
import { AgeBadgeDirective } from '../directives/age-badge.directive'; // ASSUMPTION: adjust path
import { CaseStatusBadgeDirective } from '../directives/case-status-badge.directive'; // ASSUMPTION: adjust path
import { MyCasesService } from './my-cases.service';
import { CasesFilterBase, MyCaseListItemDto } from './my-cases.model';

const PAGE_SIZE = 4;

@Component({
  selector: 'app-my-cases-tab',
  standalone: true,
  imports: [FormsModule, AgeBadgeDirective, CaseStatusBadgeDirective],
  templateUrl: './my-cases-tab.html',
})
export class MyCasesTab implements OnInit {
  readonly #myCasesService = inject(MyCasesService);

  readonly caseTypeTabs: { id: CaseType; label: string }[] = [
    { id: CaseType.LongTerm, label: 'طويلة الأمد' },
    { id: CaseType.Urgent, label: 'العاجلة' },
    { id: CaseType.Unknown, label: 'مجهولة الهوية' },
  ];

  readonly activeCaseType = signal<CaseType>(CaseType.LongTerm);
  readonly cases = signal<MyCaseListItemDto[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly totalCount = signal(0);

  // Simple filters
  readonly fullNameFilter = signal('');
  readonly statusFilter = signal<CaseStatus | null>(null);

  readonly statusOptions = Object.values(CaseStatus);

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  ngOnInit(): void {
    this.#loadCases();
  }

  switchCaseType(type: CaseType): void {
    if (this.activeCaseType() === type) return;
    this.activeCaseType.set(type);
    this.currentPage.set(1);
    this.#loadCases();
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.#loadCases();
  }

  clearFilters(): void {
    this.fullNameFilter.set('');
    this.statusFilter.set(null);
    this.currentPage.set(1);
    this.#loadCases();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.#loadCases();
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  #loadCases(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filter: CasesFilterBase = {
      page: this.currentPage(),
      pageSize: PAGE_SIZE,
      fullName: this.fullNameFilter() || undefined,
      status: this.statusFilter() ?? undefined,
    };

    this.#myCasesService.getMyCases(this.activeCaseType(), filter).subscribe({
      next: (res) => {
        const data = res.data;
        this.cases.set(data.items);
        this.totalPages.set(data.totalPages || 1);
        this.totalCount.set(data.totalCount);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('تعذّر تحميل الحالات الخاصة بك. يرجى إعادة المحاولة.');
        this.isLoading.set(false);
        console.error('Load my cases error:', err);
      },
    });
  }
}
