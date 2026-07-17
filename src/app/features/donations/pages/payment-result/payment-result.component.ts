import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from './service/payment.service'; // Adjust path

@Component({
  selector: 'app-payment-result',
  standalone: true,
  templateUrl: './payment-result.component.html',
})
export class PaymentResultComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paymentService = inject(PaymentService);

  ngOnInit(): void {
    const query = this.route.snapshot.queryParams;

    this.paymentService.getPaymentResult(query).subscribe({
      next: (res) => {
        if (res.success) {
          this.router.navigate(['/donation/payment-success']);
        } else {
          this.router.navigate(['/donation/payment-failed'], {
            queryParams: {
              message: res.message,
            },
          });
        }
      },
      error: () => {
        this.router.navigate(['/donation/payment-failed'], {
          queryParams: {
            message: 'حدث خطأ أثناء التحقق من عملية الدفع.',
          },
        });
      },
    });
  }
}
