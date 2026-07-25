import { Routes } from '@angular/router';
import { LongTermList } from './pages/long-term-list/long-term-list';
import { permissionGuard } from '../../core/guards/permission.guard';
import { Permissions } from '../../core/constants/Permissions';

export const LONG_TERM_ROUTES: Routes = [
    { 
      path: '', 
      title: 'حالات طويلة المدى | لقاء',
      component: LongTermList
    },
    {
      path: 'create',
      title: 'إضافة حالة طويلة المدى | لقاء',
      canActivate: [permissionGuard],
      data: { requiredPermission: Permissions.LongTermCases.Create },
      loadComponent: () => import('./pages/long-term-create/long-term-create').then(c => c.LongTermCreate)
    },
    {
      path: 'edit/:id',
      title: 'تعديل حالة طويلة المدى | لقاء',
      canActivate: [permissionGuard],
      data: { requiredPermission: Permissions.LongTermCases.Update },
      loadComponent: () =>
        import('./pages/long-term-update/long-term-update')
          .then(c => c.LongTermUpdate)
    },
    {
      path: ':id',
      title: 'تفاصيل الحالة | لقاء',
      loadComponent: () => import('./pages/long-term-details/long-term-details').then(c => c.LongTermDetails)
    }
];