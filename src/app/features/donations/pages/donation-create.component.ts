import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DonationService } from '../services/donations.service';

@Component({
  selector: 'app-donation-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './donation-create.component.html',
})
export class DonationCreateComponent {
  private donationService = inject(DonationService);

  //   amounts = [10, 50, 100, 500];

  selectedAmount = 10;

  customAmount: number | null = null;

  message = '';

  loading = false;

  amount = 10;

  presetAmounts = [10, 50, 100, 500];

  selectAmount(value: number): void {
    this.amount = value;
  }

  //   selectAmount(amount: number): void {
  //     this.selectedAmount = amount;
  //     this.customAmount = null;
  //   }

  donate(): void {
    const amount = this.selectedAmount > 0 ? this.selectedAmount : (this.customAmount ?? 0);

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

          if (res.success && res.data) {
            window.location.href = res.data.checkoutUrl;
          }
        },
        error: () => {
          this.loading = false;
          alert('حدث خطأ أثناء إنشاء عملية الدفع');
        },
      });
  }
}
