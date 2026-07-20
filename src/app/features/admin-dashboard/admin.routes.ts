import { Routes } from '@angular/router';
import { UserRole } from '../../shared/enums/user-role';
import { roleGuard } from '../../core/guards/role-guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: [UserRole.Admin, UserRole.Moderator] },
    loadComponent: () => import('./pages/overview/overview').then((c) => c.Overview),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Moderator] },
        title: 'لوحة التحكم | لقاء',
        loadComponent: () =>
          import('./pages/dashboard-statistics/dashboard-statistics').then(
            (m) => m.DashboardStatistics,
          ),
      },
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Moderator] },
        title: 'إدارة المستخدمين | لقاء',
        loadComponent: () => import('./pages/user-list/user-list').then((m) => m.UserList),
      },
      {
        path: 'users/registerByAdmin',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] },
        title: 'تسجيل مستخدم جديد | لقاء',
        loadComponent: () =>
          import('./pages/register-by-admin/register-by-admin').then((m) => m.RegisterByAdmin),
      },
      {
        path: 'rolesManagement',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] },
        title: 'إدارة الأدوار | لقاء',
        loadComponent: () =>
          import('./pages/role-management/role-management').then((m) => m.RoleManagement),
      },
      {
        path: 'users/:id',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Moderator] },
        title: 'تفاصيل المستخدم | لقاء',
        loadComponent: () => import('./pages/user-details/user-details').then((m) => m.UserDetails),
      },
      {
        path: 'donations',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] },
        title: 'إدارة التبرعات | لقاء',
        loadComponent: () =>
          import('./pages/donations/pages/donation-list/donation-admin-list.component').then(
            (m) => m.DonationAdminListComponent,
          ),
      },
      {
        path: 'chats',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] },
        title: 'إدارة المحادثات | لقاء',
        loadComponent: () =>
          import('../chat/pages/admin-chats/admin-chats').then((m) => m.AdminChats),
      },
      {
        path: 'chats/:chatId',
        canActivate: [roleGuard],
        data: {
          roles: [UserRole.Admin],
          mode : 'admin',
        },
        title:'المحادثة | لقاء',
        loadComponent: () =>
          import('../chat/pages/chat-window/chat-window').then((m) => m.ChatWindow),
      },
      {
        path: 'cases-management',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Moderator] },
        title: 'إدارة الحالات | لقاء',
        loadComponent: () =>
          import('./pages/cases-management/cases-management').then((m) => m.CasesManagement),
      },
{
  path: 'long-term/:id',
  loadComponent: () =>
    import('../long-term-cases/pages/long-term-details/long-term-details')
      .then(c => c.LongTermDetails),
},
{
  path: 'unknown/:id',
  loadComponent: () =>
    import('../unknown-cases/pages/unknown-details/unknown-details')
      .then(c => c.UnknownDetails),
},
{
  path: 'urgent/:id',
  loadComponent: () =>
    import('../urgent-cases/pages/urgent-details/urgent-details')
      .then(c => c.UrgentDetails),
},
      {
        path: 'complaints-management',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin, UserRole.Moderator] },
        title: 'إدارة الشكاوى | لقاء',
        loadComponent: () =>
          import('../complaints/pages/complaints-list/complaints-list').then((m) => m.ComplaintsList),
      },
    ],
  },
];
