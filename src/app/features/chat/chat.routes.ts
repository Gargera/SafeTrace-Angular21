import { Routes } from '@angular/router';
import { ChatWindow } from './pages/chat-window/chat-window';
import { authGuard } from '../../core/guards/auth-guard';

export const CHAT_ROUTES: Routes = [
  { 
    path: 'start/:caseId', 
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/start-chat/start-chat').then((m) => m.StartChat),
  },
  // {
  //   path:'chat/:chatId',
  //   loadComponent: () =>
  //     import('./pages/chat-window/chat-window').then((m) => m.ChatWindow),
  // },
  {
    path: '',
    redirectTo: 'chats',
    pathMatch: 'full'
  }
];