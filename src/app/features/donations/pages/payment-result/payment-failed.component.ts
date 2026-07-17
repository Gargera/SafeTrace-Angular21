import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-payment-failed',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './payment-failed.component.html',
})
export class PaymentFailedComponent {
  private readonly route = inject(ActivatedRoute);

  readonly message = this.route.snapshot.queryParamMap.get('message') ?? 'تعذر إتمام عملية الدفع.';
}
