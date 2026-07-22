import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { DonationService } from '../../../../services/donations.service';
import { DonationAdminListDto } from '../../models/donation-admin-list.dto';
import { PaymentStatus } from '../../../../../../shared/enums/payment-status.enum';
import { TruncatePipe } from '../../../../../../shared/pipes/truncate-pipe';
import { CardComponent } from '../../../../../../shared/components/card/card';

import { CaseHeaderComponent } from '../../../../../../shared/components/cases-components/case-header/case-header.component';
import { LoadingSpinnerComponent } from '../../../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../../../shared/components/empty-state/empty-state.component';
import { ButtonComponent } from '../../../../../../shared/components/button/button';
import { FormField } from '../../../../../../shared/components/form-field/form-field';
import { PaymentStatusBadgeDirective } from '../../../../../../shared/directives/payment-status-badge.directive';
import { AdminDonationStatisticsDto } from '../../models/admin-donation-statistics.dto';
import { Permissions } from '../../../../../../core/constants/Permissions';
import { HasPermissionDirective } from '../../../../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-donation-admin-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TruncatePipe,
    CardComponent,
    CaseHeaderComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ButtonComponent,
    FormField,
    PaymentStatusBadgeDirective,
    HasPermissionDirective,
  ],
  templateUrl: './donation-admin-list.component.html',
})
export class DonationAdminListComponent implements OnInit {
  private readonly donationService = inject(DonationService);
  private readonly searchSubject = new Subject<string>();

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

  pageNumber = signal(1);
  pageSize = 12;
  totalCount = signal(0);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));

  pagesArray = computed(() => {
    const current = this.pageNumber();
    const total = this.totalPages();
    const pages: number[] = [];
    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);

    if (current <= 3) {
      end = Math.min(total, 5);
    }
    if (current >= total - 2) {
      start = Math.max(1, total - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  ngOnInit(): void {
    this.loadStatistics();
    this.loadDonations();

    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
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
    this.loading.set(true);
    this.donationService
      .getDonations({
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize,
        userEmail: this.search() || undefined,
        paymentStatus: (this.selectedStatus() as PaymentStatus) || undefined,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.donations.set(res.items ?? []);
          this.totalCount.set(res.totalCount);
        },
        error: () => {
          this.loading.set(false);
          this.donations.set([]);
        },
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

  resetFilters(): void {
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
}
