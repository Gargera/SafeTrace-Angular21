import { Routes } from '@angular/router';

export const FOUNDED_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/list/founded-list.component').then((m) => m.FoundedListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/detail/founded-detail.component').then((m) => m.FoundedDetailComponent),
  },
];
