import { Routes } from '@angular/router';

export const FOUNDED_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/founded-list/founded-list').then((m) => m.FoundedList),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/founded-details/founded-details').then((m) => m.FoundedDetails),
  },
];

