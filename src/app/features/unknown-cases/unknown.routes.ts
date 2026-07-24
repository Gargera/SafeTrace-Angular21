import { Routes } from '@angular/router';
import { UnknownList } from './pages/unknown-list/unknown-list';
import { permissionGuard } from '../../core/guards/permission.guard';
import { Permissions } from '../../core/constants/Permissions';

export const UNKNOWN_ROUTES: Routes = [
  { 
    path: '', 
    title: 'الأشخاص المجهولين | لقاء',
    component: UnknownList
  },
  {
    path: 'create',
    title: 'إضافة شخص مجهول | لقاء',
    canActivate: [permissionGuard],
    data: { requiredPermission: Permissions.UnknownCases.Create },
    loadComponent: () => import('./pages/unknown-create/unknown-create').then(c => c.UnknownCreate)
  },
  {
    path: 'edit/:id',
    title: 'تعديل شخص مجهول | لقاء',
    canActivate: [permissionGuard],
    data: { requiredPermission: Permissions.UnknownCases.Update },
    loadComponent: () =>
      import('./pages/unknown-update/unknown-update')
        .then(c => c.UnknownUpdate)
  },
  {
    path: ':id',
    title: 'تفاصيل الحالة | لقاء',
    loadComponent: () => import('./pages/unknown-details/unknown-details').then(c => c.UnknownDetails)
  }
];