import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { DonationService } from '../../../../services/donations.service';
import { DonationAdminListDto } from '../../models/donation-admin-list.dto';
import { PaymentStatus } from '../../models/payment-status';
import { TruncatePipe } from '../../../../../../shared/pipes/truncate-pipe';

@Component({
  selector: 'app-donation-admin-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TruncatePipe],
  templateUrl: './donation-admin-list.component.html',
})
export class DonationAdminListComponent implements OnInit {
  private readonly donationService = inject(DonationService);
  private readonly searchSubject = new Subject<string>();
  selectedMessage = signal<DonationAdminListDto | null>(null);

  openMessage(donation: DonationAdminListDto): void {
    if (!donation.message) return;
    this.selectedMessage.set(donation);
  }

  closeMessage(): void {
    this.selectedMessage.set(null);
  }
  donations = signal<DonationAdminListDto[]>([]);
  loading = signal(false);

  search = '';
  selectedStatus: PaymentStatus | null = null;

  readonly statuses = [
    { label: 'الكل', value: null },
    { label: 'قيد الانتظار', value: PaymentStatus.Pending },
    { label: 'ناجحة', value: PaymentStatus.Succeeded },
    { label: 'فشلت', value: PaymentStatus.Failed },
  ];

  pageNumber = signal(1);
  pageSize = 12;

  totalCount = signal(0);
  totalPages = signal(0);

  readonly showingFrom = computed(() =>
    this.totalCount() === 0 ? 0 : (this.pageNumber() - 1) * this.pageSize + 1,
  );
  readonly showingTo = computed(() =>
    Math.min(this.pageNumber() * this.pageSize, this.totalCount()),
  );

  ngOnInit(): void {
    this.loadDonations();

    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
      this.pageNumber.set(1);
      this.loadDonations();
    });
  }

  onSearchInput(): void {
    this.searchSubject.next(this.search);
  }

  loadDonations(): void {
    this.loading.set(true);

    this.donationService
      .getDonations({
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize,
        userEmail: this.search || undefined,
        paymentStatus: this.selectedStatus,
      })
      .subscribe({
        next: (res) => {
          console.log(res);
          this.loading.set(false);
          this.donations.set(res.items ?? []);
          this.totalCount.set(res.totalCount);
          this.totalPages.set(res.totalPages);
        },
        error: () => {
          this.loading.set(false);
          this.donations.set([]);
        },
      });
  }

  onStatusChange(): void {
    this.pageNumber.set(1);
    this.loadDonations();
  }

  previousPage(): void {
    if (this.pageNumber() <= 1) return;
    this.pageNumber.update((p) => p - 1);
    this.loadDonations();
  }

  nextPage(): void {
    if (this.pageNumber() >= this.totalPages()) return;
    this.pageNumber.update((p) => p + 1);
    console.log(this.pageNumber(), this.totalPages());
    this.loadDonations();
  }

  getStatusText(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.Pending:
        return 'قيد الانتظار';
      case PaymentStatus.Succeeded:
        return 'ناجحة';
      case PaymentStatus.Failed:
        return 'فشلت';

      default:
        return '';
    }
  }

  getStatusClass(status: PaymentStatus): Record<string, boolean> {
    return {
      'bg-amber-100 text-amber-700 ring-1 ring-amber-200': status === PaymentStatus.Pending,
      'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200': status === PaymentStatus.Succeeded,
      'bg-red-100 text-red-700 ring-1 ring-red-200': status === PaymentStatus.Failed,
    };
  }
}
