import { Routes } from '@angular/router';
import { ProfileView } from './profile-view';
import { authGuard } from '../../core/guards/auth.guard';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: ProfileView
  },
  {
    path: 'chats',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../chat/pages/my-chats/my-chats').then((m) => m.MyChats),
  },
  {
    path: 'chat/:chatId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../chat/pages/chat-window/chat-window').then((m) => m.ChatWindow),
  }
];