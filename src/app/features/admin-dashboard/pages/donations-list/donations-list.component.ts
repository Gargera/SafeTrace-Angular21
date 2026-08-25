import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  EMPTY,
  tap,
} from 'rxjs';

import { DonationService } from '../../../donations/services/donations.service';
import { DonationAdminListDto } from '../../../donations/models/responses/donation-admin-list.dto';
import { AdminDonationStatisticsDto } from '../../../donations/models/responses/admin-donation-statistics.dto';
import { PaymentStatus } from '../../../../shared/enums/payment-status.enum';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';
import { CardComponent } from '../../../../shared/components/card/card';

import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { PaymentStatusBadgeDirective } from '../../../../shared/directives/payment-status-badge.directive';
import { Permissions } from '../../../../core/constants/Permissions';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { TableSkeletonComponent } from '../../../../shared/components/skeletons/table-skeleton/table-skeleton.component';
import { ReportService } from '../../services/report.service';
import { CacheService } from '../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';

const UI_STATE_CACHE_KEY = 'DonationsList_UI_State';

@Component({
  selector: 'app-donations-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TruncatePipe,
    CardComponent,
    HeaderComponent,
    EmptyStateComponent,
    ButtonComponent,
    FormField,
    PaymentStatusBadgeDirective,
    HasPermissionDirective,
    PaginationComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './donations-list.component.html',
})
export class DonationsListComponent implements OnInit {
  private readonly donationService = inject(DonationService);
  private readonly searchSubject = new Subject<string>();
  private readonly reportService = inject(ReportService);
  private readonly cacheService = inject(CacheService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fetchTrigger$ = new Subject<void>();

  Permissions = Permissions;

  selectedMessage = signal<DonationAdminListDto | null>(null);
  donations = signal<DonationAdminListDto[]>([]);
  loading = signal(false);

  statistics = signal<AdminDonationStatisticsDto | null>(null);
  isLoadingStats = signal(true);

  search = signal('');
  selectedStatus = signal<PaymentStatus | string>('');

  readonly PaymentStatus = PaymentStatus;
  readonly statuses = [
    { label: 'ناجح', value: PaymentStatus.Succeeded },
    { label: 'قيد الانتظار', value: PaymentStatus.Pending },
    { label: 'فشل', value: PaymentStatus.Failed },
    { label: 'ملغي', value: PaymentStatus.Cancelled },
    { label: 'مسترد', value: PaymentStatus.Refunded },
  ];

  isDownloading = signal(false);

  pageNumber = signal(1);
  pageSize = 12;
  totalCount = signal(0);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));

  readonly hasActiveFilters = computed(() => {
    return !!(this.search() || this.selectedStatus());
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cacheService.set(
        UI_STATE_CACHE_KEY,
        {
          search: this.search(),
          selectedStatus: this.selectedStatus(),
          pageNumber: this.pageNumber(),
        },
        CACHE_TTL.UI_STATE,
        [CACHE_TAGS.UI_STATE],
      );
    });
  }

  ngOnInit(): void {
    const cachedState = this.cacheService.get<{
      search: string;
      selectedStatus: PaymentStatus | string;
      pageNumber: number;
    }>(UI_STATE_CACHE_KEY);

    if (cachedState) {
      this.search.set(cachedState.search);
      this.selectedStatus.set(cachedState.selectedStatus);
      this.pageNumber.set(cachedState.pageNumber);
    }

    this.loadStatistics();
    this.setupFetchPipeline();
    this.loadDonations();

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageNumber.set(1);
        this.loadDonations();
      });
  }

  private loadStatistics(): void {
    this.isLoadingStats.set(true);
    this.donationService.getDonationStatistics().subscribe({
      next: (res) => {
        this.statistics.set(res.data!);
        this.isLoadingStats.set(false);
      },
      error: () => this.isLoadingStats.set(false),
    });
  }

  loadDonations(): void {
    this.fetchTrigger$.next();
  }

  private setupFetchPipeline(): void {
    this.fetchTrigger$
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(() =>
          this.donationService
            .getDonations({
              pageNumber: this.pageNumber(),
              pageSize: this.pageSize,
              userEmail: this.search() || undefined,
              paymentStatus: (this.selectedStatus() as PaymentStatus) || undefined,
            })
            .pipe(
              catchError((err) => {
                this.loading.set(false);
                this.donations.set([]);
                this.totalCount.set(0);
                return EMPTY;
              }),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) {
          this.loading.set(false);
          this.donations.set(res.items ?? []);
          this.totalCount.set(res.totalCount);
        }
      });
  }

  onSearchInput(value: string): void {
    this.search.set(value);
    this.searchSubject.next(value);
  }

  updateFilterStatus(status: string): void {
    this.selectedStatus.set(status);
    this.pageNumber.set(1);
    this.loadDonations();
  }

  private readonly toast = inject(SnackbarService);

  resetFilters(): void {
    this.cacheService.remove(UI_STATE_CACHE_KEY);
    this.search.set('');
    this.selectedStatus.set('');
    this.pageNumber.set(1);
    this.loadDonations();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageNumber.set(page);
      this.loadDonations();
    }
  }

  formatAmount(amount: number | undefined): string {
    if (amount === undefined) return '0';
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    }
    if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toString();
  }

  openMessage(donation: DonationAdminListDto): void {
    if (!donation.message) return;
    this.selectedMessage.set(donation);
  }

  closeMessage(): void {
    this.selectedMessage.set(null);
  }

  downloadReport(): void {
    if (this.isDownloading()) return;
    this.isDownloading.set(true);
    this.reportService
      .generateDonationPdfReport({
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize,
        userEmail: this.search() || undefined,
        paymentStatus: (this.selectedStatus() as PaymentStatus) || undefined,
      })
      .subscribe({
        next: (response) => {
          this.isDownloading.set(false);
          this.reportService.download(response);
        },
        error: (err) => {
          this.isDownloading.set(false);
          this.toast.error(extractErrorMessage(err, 'حدث خطأ أثناء تحميل التقرير.'));
        },
      });
  }
}
