import { Routes } from '@angular/router';
import { DonationCreateComponent } from './pages/donation/donation-create.component';
import { PaymentFailedComponent } from './pages/payment-result/payment-failed.component';
import { PaymentSuccessComponent } from './pages/payment-result/payment-success.component';
import { PaymentResultComponent } from './pages/payment-result/payment-result.component';

export const DONATIONS_ROUTES: Routes = [
  {
    path: '',
    component: DonationCreateComponent,
  },
  {
    path: 'payment-result',
    component: PaymentResultComponent,
  },
  {
    path: 'payment-success',
    component: PaymentSuccessComponent,
  },
  {
    path: 'payment-failed',
    component: PaymentFailedComponent,
  },
];
