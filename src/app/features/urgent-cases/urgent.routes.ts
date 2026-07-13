import { Routes } from '@angular/router';
import { UrgentListComponent } from './pages/urgent-list/urgent-list';
import { UrgentDetailComponent } from './pages/urgent-detail/urgent-detail';

export const URGENT_ROUTES: Routes = [
  { 
    path: '', 
    component: UrgentListComponent
  },
  {
    path: ':id',
    component: UrgentDetailComponent
  }
];