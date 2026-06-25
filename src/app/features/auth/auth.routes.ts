import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';

export const AUTH_ROUTES: Routes = [
  {path: '', component: Login},
  {path: 'register', component: Register}
];