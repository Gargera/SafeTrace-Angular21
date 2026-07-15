import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DonationService } from '../../../../services/donations.service';
import { DonationAdminListDto } from '../../models/donation-admin-list.dto';
import { PaymentStatus } from '../../models/payment-status';

@Component({
  selector: 'app-donation-admin-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-admin-list.component.html',
})
export class DonationAdminListComponent implements OnInit {
  private readonly donationService = inject(DonationService);

  donations: DonationAdminListDto[] = [];

  loading = false;

  search = '';

  selectedStatus: PaymentStatus | null = null;

  readonly statuses = [
    { label: 'الكل', value: null },
    { label: 'قيد الانتظار', value: PaymentStatus.Pending },
    { label: 'ناجحة', value: PaymentStatus.Succeeded },
    { label: 'فشلت', value: PaymentStatus.Failed },
    { label: 'ملغاة', value: PaymentStatus.Cancelled },
  ];

  pageNumber = 1;
  pageSize = 10;

  totalCount = 0;
  totalPages = 0;

  ngOnInit(): void {
    this.loadDonations();
  }

  loadDonations(): void {
    this.loading = true;

    this.donationService
      .getDonations({
        pageNumber: this.pageNumber,
        pageSize: this.pageSize,
        search: this.search || undefined,
        paymentStatus: this.selectedStatus,
      })
      .subscribe({
        next: (res) => {
          this.loading = false;

          if (!res) return;

          this.donations = res.items;
          this.totalCount = res.totalCount;
          this.totalPages = res.totalPages;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.loadDonations();
  }

  onStatusChange(): void {
    this.pageNumber = 1;
    this.loadDonations();
  }

  previousPage(): void {
    if (this.pageNumber <= 1) return;

    this.pageNumber--;
    this.loadDonations();
  }

  nextPage(): void {
    if (this.pageNumber >= this.totalPages) return;

    this.pageNumber++;
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

      case PaymentStatus.Cancelled:
        return 'ملغاة';

      default:
        return '';
    }
  }

  getStatusClass(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.Pending:
        return 'bg-yellow-100 text-yellow-700';

      case PaymentStatus.Succeeded:
        return 'bg-green-100 text-green-700';

      case PaymentStatus.Failed:
        return 'bg-red-100 text-red-700';

      case PaymentStatus.Cancelled:
        return 'bg-gray-100 text-gray-700';

      default:
        return '';
    }
  }
}
