import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DonationService } from '../../services/donations.service';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CardComponent } from '../../../../shared/components/card/card';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';

const MIN_DONATION_AMOUNT = 10;
const MAX_DONATION_AMOUNT = 100_000;

@Component({
  selector: 'app-donation-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    CardComponent,
    ButtonComponent,
    FormField,
  ],
  templateUrl: './donation-create.component.html',
})
export class DonationCreateComponent {
  private readonly donationService = inject(DonationService);
  private readonly snackbar = inject(SnackbarService);

  message = '';
  loading = false;
  amount: number | null = 10;

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
      return `الحد الأدنى للتبرع هو ${MIN_DONATION_AMOUNT} ج.م`;
    }

    if (parsed > MAX_DONATION_AMOUNT) {
      return `الحد الأقصى للتبرع هو ${MAX_DONATION_AMOUNT.toLocaleString()} ج.م`;
    }

    return null;
  }

  get isAmountValid(): boolean {
    return this.amountError === null;
  }

  donate(): void {
    if (this.loading) return;
    if (!this.isAmountValid) {
      this.snackbar.warning(this.amountError || 'الرجاء التأكد من إدخال مبلغ تبرع صحيح');
      return;
    }

    const amount = Number(this.amount);

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
            this.snackbar.info('جاري تحويلك لصفحة الدفع الآمن...');
            window.location.href = res.data.checkoutUrl;
          } else {
            this.snackbar.error(res.message || 'حدث خطأ أثناء إعداد عملية التبرع');
          }
        },
        error: (err) => {
          this.loading = false;
          const errorMsg =
            extractErrorMessage(err, 'حدث خطأ أثناء إنشاء عملية الدفع، يرجى المحاولة لاحقاً');
          this.snackbar.error(errorMsg);
        },
      });
  }
}
