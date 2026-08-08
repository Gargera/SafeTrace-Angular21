import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/guards/permission.guard';
import { Permissions } from '../../core/constants/Permissions';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { requiredPermission: Permissions.Cases.GetAll },
    loadComponent: () => import('../../core/layouts/admin-layout/admin-layout').then((c) => c.AdminLayoutComponent),
    children: [
      {
        path: '',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.Cases.GetAll },
        title: 'إدارة الحالات | لقاء',
        loadComponent: () =>
          import('./pages/cases-management/cases-management').then(
            (m) => m.CasesManagement,
          ),
      },
      {
        path: 'dashboard',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.Dashboard.GetStatistics },
        title: 'لوحة التحكم | لقاء',
        loadComponent: () =>
          import('./pages/dashboard-statistics/dashboard-statistics').then(
            (m) => m.DashboardStatistics,
          ),
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.Users.GetAll },
        title: 'إدارة المستخدمين | لقاء',
        loadComponent: () => import('./pages/user-list/user-list').then((m) => m.UserList),
      },
      {
        path: 'users/registerByAdmin',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.Users.RegisterByAdmin },
        title: 'تسجيل مستخدم جديد | لقاء',
        loadComponent: () =>
          import('./pages/register-by-admin/register-by-admin').then((m) => m.RegisterByAdmin),
      },
      {
        path: 'rolesManagement',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.Roles.GetPermissionsByRoleId },
        title: 'إدارة الأدوار | لقاء',
        loadComponent: () =>
          import('./pages/role-management/role-management').then((m) => m.RoleManagement),
      },
      {
        path: 'users/:id',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.Users.GetById },
        title: 'تفاصيل المستخدم | لقاء',
        loadComponent: () => import('./pages/user-details/user-details').then((m) => m.UserDetails),
      },
      {
        path: 'donations',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.Donations.GetDonations },
        title: 'إدارة التبرعات | لقاء',
        loadComponent: () =>
          import('./pages/donations-list/donations-list.component').then(
            (m) => m.DonationsListComponent,
          ),
      },
      {
        path: 'chats',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.Chat.GetAll },
        title: 'إدارة المحادثات | لقاء',
        loadComponent: () =>
          import('./pages/chats/chats').then((m) => m.AdminChats),
      },
      {
        path: 'chats/:chatId',
        canActivate: [permissionGuard],
        data: {
          requiredPermission: Permissions.Chat.GetById,
          mode : 'admin',
        },
        title:'المحادثة | لقاء',
        loadComponent: () =>
          import('../chat/pages/chat-window/chat-window').then((m) => m.ChatWindow),
      },
      {
        path: 'cases-management',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.Cases.GetAll },
        title: 'إدارة الحالات | لقاء',
        loadComponent: () =>
          import('./pages/cases-management/cases-management').then((m) => m.CasesManagement),
      },
      {
        path: 'long-term/:id',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.LongTermCases.GetById, mode: 'dashboard' },
        loadComponent: () =>
          import('../long-term-cases/pages/long-term-details/long-term-details')
            .then(c => c.LongTermDetails),
      },
      {
        path: 'unknown/:id',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.UnknownCases.GetById, mode: 'dashboard' },
        loadComponent: () =>
          import('../unknown-cases/pages/unknown-details/unknown-details')
            .then(c => c.UnknownDetails),
      },
      {
        path: 'urgent/:id',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.UrgentCases.GetById, mode: 'dashboard' },
        loadComponent: () =>
          import('../urgent-cases/pages/urgent-details/urgent-details')
            .then(c => c.UrgentDetails),
      },
      {
        path: 'complaints-management',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.Complaints.GetAll },
        title: 'إدارة الشكاوى | لقاء',
        loadComponent: () =>
          import('../complaints/pages/complaints-list/complaints-list').then((m) => m.ComplaintsList),
      },
      {
        path: 'audit-logs',
        canActivate: [permissionGuard],
        data: { requiredPermission: Permissions.Dashboard.GetAuditLogs },
        title: 'سجلات النظام | لقاء',
        loadComponent: () =>
          import('./pages/audit-logs/audit-logs.component').then((m) => m.AuditLogsComponent),
      },
    ],
  },
];
