import { Routes } from '@angular/router';
import { UserRole } from '../../shared/enums/user-role';
import { roleGuard } from '../../core/guards/role-guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/overview/overview').then((c) => c.Overview),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        title: 'لوحة التحكم | لقاء',
        loadComponent: () =>
          import('./pages/dashboard-statistics/dashboard-statistics').then(
            (m) => m.DashboardStatistics,
          ),
      },
      {
        path: 'users',
        title: 'المستخدمون | لقاء',
        loadComponent: () =>
          import('./pages/user-list/user-list').then(
            (m) => m.UserList,
          ),
      },
      {
        path: 'users/registerByAdmin',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] },
        title: 'تسجيل مستخدم جديد | لقاء',
        loadComponent: () =>
          import('./pages/register-by-admin/register-by-admin').then(
            (m) => m.RegisterByAdmin,
          ),
      },
    ],
  },
];
