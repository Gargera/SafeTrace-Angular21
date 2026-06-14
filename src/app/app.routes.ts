import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';

export const routes: Routes = [
  { 
    path: 'auth', 
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES) 
  },
  { 
    path: 'admin', 
    canActivate: [authGuard, adminGuard], 
    loadChildren: () => import('./features/admin-dashboard/admin.routes').then(m => m.ADMIN_ROUTES) 
  },

  {
    path: '',
    loadComponent: () => import('./shared/components/main-layout/main-layout').then(c => c.MainLayout),
    children: [
      { 
        path: 'home', 
        loadChildren: () => import('./features/home-support/home-support.routes').then(m => m.HOME_SUPPORT_ROUTES) 
      },
      { 
        path: 'founded', 
        loadChildren: () => import('./features/founded-cases/founded.routes').then(m => m.FOUNDED_ROUTES) 
      },
      { 
        path: 'urgent', 
        loadChildren: () => import('./features/urgent-cases/urgent.routes').then(m => m.URGENT_ROUTES) 
      },
      { 
        path: 'long-term', 
        loadChildren: () => import('./features/long-term-cases/long-term.routes').then(m => m.LONG_TERM_ROUTES) 
      },
      { 
        path: 'unknown', 
        loadChildren: () => import('./features/unknown-cases/unknown.routes').then(m => m.UNKNOWN_ROUTES) 
      },

      { 
        path: 'chat', 
        canActivate: [authGuard], 
        loadChildren: () => import('./features/chat/chat.routes').then(m => m.CHAT_ROUTES) 
      },
      { 
        path: 'profile', 
        canActivate: [authGuard],
        loadChildren: () => import('./features/user-profile/profile.routes').then(m => m.PROFILE_ROUTES) 
      }
    ]
  },
  
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '403', loadComponent: () => import('./shared/components/access-denied/access-denied').then(c => c.AccessDenied) },
  { path: '**', loadComponent: () => import('./shared/components/not-found/not-found').then(c => c.NotFound) }
];