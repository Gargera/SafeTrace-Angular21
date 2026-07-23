import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DonationService } from './services/donations.service';

const MIN_DONATION_AMOUNT = 10;
const MAX_DONATION_AMOUNT = 100_000;

@Component({
  selector: 'app-donation-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-create.component.html',
})
export class DonationCreateComponent {
  private donationService = inject(DonationService);

  message = '';

  loading = false;

  amount = 10;

  presetAmounts = [10, 50, 100, 500];

  readonly minAmount = MIN_DONATION_AMOUNT;
  readonly maxAmount = MAX_DONATION_AMOUNT;

  selectAmount(value: number): void {
    this.amount = value;
  }

  get amountError(): string | null {
    const value = this.amount;

    if (value === null || value === undefined || value === ('' as unknown)) {
      return 'الرجاء إدخال مبلغ التبرع';
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return 'الرجاء إدخال مبلغ صحيح';
    }

    if (parsed < MIN_DONATION_AMOUNT) {
      return `الحد الأدنى للتبرع هو ${MIN_DONATION_AMOUNT}$`;
    }

    if (parsed > MAX_DONATION_AMOUNT) {
      return `الحد الأقصى للتبرع هو ${MAX_DONATION_AMOUNT.toLocaleString()}$`;
    }

    return null;
  }

  get isAmountValid(): boolean {
    return this.amountError === null;
  }

  donate(): void {
    if (!this.isAmountValid) {
      alert(this.amountError);
      return;
    }

    const amount = this.getDonationAmount();

    this.loading = true;

    this.donationService
      .createDonation({
        amount,
        message: this.message,
      })
      .subscribe({
        next: (res) => {
          this.loading = false;

          if (res.success && res.data?.checkoutUrl) {
            window.location.href = res.data.checkoutUrl;
          }
        },
        error: () => {
          this.loading = false;
          alert('حدث خطأ أثناء إنشاء عملية الدفع');
        },
      });
  }

  private getDonationAmount(): number {
    return Number(this.amount);
  }
}
