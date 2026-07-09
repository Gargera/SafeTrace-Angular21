import { Routes } from '@angular/router';
import { ChatWindow } from './pages/chat-window/chat-window';

export const CHAT_ROUTES: Routes = [
  { 
    path: 'start/:caseId', 
    loadComponent: () =>
      import('./pages/start-chat/start-chat').then((m) => m.StartChat),
  },
  {
    path:'chat/:chatId',
    loadComponent: () =>
      import('./pages/chat-window/chat-window').then((m) => m.ChatWindow),
  },
  {
    path:'chats',
    loadComponent: () => 
      import('./pages/my-chats/my-chats').then((m) => m.MyChats),
  },
  {
    path:'admin/chats',
    loadComponent: () => 
      import('./pages/admin-chats/admin-chats').then((m) => m.AdminChats),
  },
  {
    path: '',
    redirectTo: 'chats',
    pathMatch: 'full'
  }
];