import { Component, computed, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';

import { DashboardService } from '../../services/dashboard.service';
import { AuditLogDto, AuditLogQueryDto } from '../../models/Dashboard/responses/audit-log.dto';
import { SnackbarService } from '../../../../shared/services/toast.service';

import { FormField } from '../../../../shared/components/form-field/form-field';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { CardComponent } from '../../../../shared/components/card/card';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { AuditOperationBadgeDirective } from '../../../../shared/directives/audit-operation-badge.directive';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { CacheService } from '../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';

const UI_STATE_CACHE_KEY = 'AuditLogs_UI_State';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    FormField,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    HeaderComponent,
    AuditOperationBadgeDirective,
    DatePipe,
    PaginationComponent
  ],
  templateUrl: './audit-logs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogsComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private toast = inject(SnackbarService);
  private cacheService = inject(CacheService);
  private destroyRef = inject(DestroyRef);

  logs = signal<AuditLogDto[]>([]);
  totalCount = signal<number>(0);
  totalPages = signal<number>(0);
  isLoading = signal<boolean>(false);

  filter = signal<AuditLogQueryDto>({
    pageNumber: 1,
    pageSize: 10,
    searchEmail: '',
    searchTable: '',
    searchType: ''
  });

  selectedLog = signal<AuditLogDto | null>(null);

  private searchSubject = new Subject<string>();

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

  ngOnInit() {
    const cachedState = this.cacheService.get<{ filter: AuditLogQueryDto }>(UI_STATE_CACHE_KEY);
    if (cachedState) {
      this.filter.set(cachedState.filter);
    }

    this.loadLogs();

    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((term) => {
      this.updateFilter({ searchEmail: term, pageNumber: 1 });
    });
  }

  loadLogs() {
    this.isLoading.set(true);
    this.dashboardService.getAuditLogs(this.filter()).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.logs.set(res.data.items);
          this.totalCount.set(res.data.totalCount);
          this.totalPages.set(res.data.totalPages || Math.ceil(res.data.totalCount / this.filter().pageSize));
        } else {
          this.toast.error(res.message || 'فشل في تحميل السجلات.');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'حدث خطأ أثناء الاتصال بالخادم.');
        this.isLoading.set(false);
      },
    });
  }

  onSearchChange(value: string) {
    this.searchSubject.next(value);
  }

  updateFilter(partialFilter: Partial<AuditLogQueryDto>) {
    this.filter.update((f) => ({
      ...f,
      ...partialFilter,
      pageNumber: partialFilter.pageNumber ?? 1,
    }));
    this.loadLogs();
  }

  resetFilters() {
    this.filter.set({
      pageNumber: 1,
      pageSize: 10,
      searchEmail: '',
      searchTable: '',
      searchType: ''
    });
    this.loadLogs();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.filter.update((f) => ({ ...f, pageNumber: page }));
      this.loadLogs();
    }
  }

  viewDetails(log: AuditLogDto): void {
    this.selectedLog.set(log);
  }

  closeModal(): void {
    this.selectedLog.set(null);
  }

  formatJson(jsonString?: string): string {
    if (!jsonString) return 'لا يوجد';
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonString;
    }
  }
}
