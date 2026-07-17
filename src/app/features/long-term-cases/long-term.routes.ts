import { Routes } from '@angular/router';
import { LongTermList } from './pages/long-term-list/long-term-list';

export const LONG_TERM_ROUTES: Routes = [
    { 
      path: '', 
      component: LongTermList
    },
    {
      path: 'create',
      loadComponent: () => import('./pages/long-term-create/long-term-create').then(c => c.LongTermCreate)
    },
     {
    path: 'edit/:id',
    loadComponent: () =>
      import('./pages/long-term-update/long-term-update')
        .then(c => c.LongTermUpdate)
  },
    {
      path: ':id',
      loadComponent: () => import('./pages/long-term-details/long-term-details').then(c => c.LongTermDetails)
    }
];