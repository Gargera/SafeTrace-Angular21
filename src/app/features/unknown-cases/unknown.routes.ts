import { Routes } from '@angular/router';
import { UnknownList } from './pages/unknown-list/unknown-list';

export const UNKNOWN_ROUTES: Routes = [
  { 
    path: '', 
    component: UnknownList
  },
  {
    path: 'create',
    loadComponent: () => import('./pages/unknown-create/unknown-create').then(c => c.UnknownCreate)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/unknown-details/unknown-details').then(c => c.UnknownDetails)
  }
];