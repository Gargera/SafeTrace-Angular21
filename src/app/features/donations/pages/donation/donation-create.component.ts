import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DonationService } from './services/donations.service';

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

  selectAmount(value: number): void {
    this.amount = value;
  }

  donate(): void {
    const amount = this.getDonationAmount();

    if (amount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح');
      return;
    }

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
    const parsedAmount = Number(this.amount);
    return Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
  }
}
