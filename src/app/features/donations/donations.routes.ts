import { Routes } from '@angular/router';
import { DonationCreateComponent } from './pages/donation/donation-create.component';
import { PaymentFailedComponent } from './pages/payment-result/payment-failed.component';
import { PaymentSuccessComponent } from './pages/payment-result/payment-success.component';
import { PaymentResultComponent } from './pages/payment-result/payment-result.component';

export const DONATIONS_ROUTES: Routes = [
  {
    path: '',
    title: 'ادعمنا بتبرعك | لقاء',
    component: DonationCreateComponent,
  },
  {
    path: 'payment-result',
    title: 'نتيجة الدفع | لقاء',
    component: PaymentResultComponent,
  },
  {
    path: 'payment-success',
    title: 'نجاح عملية الدفع | لقاء',
    component: PaymentSuccessComponent,
  },
  {
    path: 'payment-failed',
    title: 'فشل عملية الدفع | لقاء',
    component: PaymentFailedComponent,
  },
];
