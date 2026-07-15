import { Routes } from '@angular/router';
import { DonationCreateComponent } from './pages/donation-create.component';

export const DONATIONS_ROUTES: Routes = [
  {
    path: '',
    component: DonationCreateComponent,
  },
];
