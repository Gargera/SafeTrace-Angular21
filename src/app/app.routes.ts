import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { About } from './shared/components/about/about';
import { permissionGuard } from './core/guards/permission.guard';
import { Permissions } from './core/constants/Permissions';
import { Home } from './shared/components/home/home';

export const routes: Routes = [
  { 
    path: 'auth', 
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES) 
  },
  {
    path: 'admin',
    canActivate: [permissionGuard],
    data: { requiredPermission: Permissions.Cases.GetAll },
    loadChildren: () =>
      import('./features/admin-dashboard/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'chat/chat/:chatId',
    title: "المحادثة | لقاء",
    canActivate: [authGuard],
    data: {mode: 'user'},
    loadComponent: () =>
      import('./features/chat/pages/chat-window/chat-window').then((m) => m.ChatWindow),
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/components/main-layout/main-layout').then((c) => c.MainLayout),
    children: [
      {
        path: '',
        title: 'الرئيسية | لقاء',
        component: Home,
      },
      {
        path: 'home',
        title: 'الرئيسية | لقاء',
        component: Home,
      },
      {
        path: 'about',
        title: 'دليل المنصة | لقاء',
        component: About,
      },
      {
        path: 'privacy-policy',
        title: 'سياسة الخصوصية | لقاء',
        loadComponent: () =>
          import('./shared/components/privacy-policy/privacy-policy').then(
            (c) => c.PrivacyPolicyComponent,
          ),
      },
      {
        path: 'founded',
        title: 'الحالات المعثور عليها | لقاء',
        loadChildren: () =>
          import('./features/founded/founded.routes').then((m) => m.FOUNDED_ROUTES),
      },
      {
        path: 'urgent',
        title: 'الحالات الطارئة | لقاء',
        loadChildren: () =>
          import('./features/urgent-cases/urgent.routes').then((m) => m.URGENT_ROUTES),
      },
      {
        path: 'long-term',
        title: 'الحالات طويلة المدى | لقاء',
        loadChildren: () =>
          import('./features/long-term-cases/long-term.routes').then((m) => m.LONG_TERM_ROUTES),
      },
      {
        path: 'unknown',
        title: 'الحالات الغير معروفة | لقاء',
        loadChildren: () =>
          import('./features/unknown-cases/unknown.routes').then((m) => m.UNKNOWN_ROUTES),
      },

      {
        path: 'aisearch',
        title: 'البحث الذكي | لقاء',
        loadChildren: () => import('./features/ai-search/ai.routes').then((m) => m.AiSearch_ROUTES),
      },
      {
        path: 'profile',
        title: 'الملف الشخصي | لقاء',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/user-profile/profile.routes').then((m) => m.PROFILE_ROUTES),
      },
      {
        path: 'donation',
        title: ' التبرع | لقاء',
        loadChildren: () =>
          import('./features/donations/donations.routes').then((m) => m.DONATIONS_ROUTES),
      },
      {
        path: 'chat',
        title: "المحادثات | لقاء",
        canActivate: [authGuard],
        loadChildren: () => import('./features/chat/chat.routes').then(m => m.CHAT_ROUTES) 
      }
    ],
  },

  {
    path: '403',
    loadComponent: () =>
      import('./shared/components/access-denied/access-denied').then((c) => c.AccessDenied),
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found').then((c) => c.NotFound),
  },
];
