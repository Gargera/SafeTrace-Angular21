import { Routes } from '@angular/router';
import { UrgentListComponent } from './pages/urgent-list/urgent-list';

export const URGENT_ROUTES: Routes = [
  { 
    path: '', 
    component: UrgentListComponent
  },
  {
    path: 'create',
    loadComponent: () => import('./pages/urgent-create/urgent-create').then(c => c.UrgentCreate)
  },
       {
    path: 'edit/:id',
    loadComponent: () =>
      import('./pages/urgent-update/urgent-update')
        .then(c => c.UrgentUpdate)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/urgent-details/urgent-details').then(c => c.UrgentDetails)
  }
];