import { Routes } from '@angular/router';
import { UrgentListComponent } from './pages/urgent-list/urgent-list';
import { authGuard } from '../../core/guards/auth-guard';

export const URGENT_ROUTES: Routes = [
  { 
    path: '', 
    title: 'الحالات الطارئة | لقاء',
    component: UrgentListComponent
  },
  {
    path: 'create',
    title: 'إضافة حالة طارئة | لقاء',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/urgent-create/urgent-create').then(c => c.UrgentCreate)
  },
  {
    path: 'edit/:id',
    title: 'تعديل حالة طارئة | لقاء',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/urgent-update/urgent-update')
        .then(c => c.UrgentUpdate)
  },
  {
    path: ':id',
    title: 'تفاصيل الحالة | لقاء',
    loadComponent: () => import('./pages/urgent-details/urgent-details').then(c => c.UrgentDetails)
  }
];