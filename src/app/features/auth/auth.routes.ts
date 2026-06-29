import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { ConfirmEmail } from './pages/confirm-email/confirm-email';
import { ResetPassword } from './pages/reset-password/reset-password';

export const AUTH_ROUTES: Routes = [
  { 
    path: '', 
    component: Login,
    title: 'تسجيل الدخول | SafeTrace'
  },
  { 
    path: 'login', 
    redirectTo: '', 
    pathMatch: 'full' 
  },
  { 
    path: 'register', 
    component: Register,
    title: 'إنشاء حساب جديد | SafeTrace'
  },
  { 
    path: 'confirm-email', 
    component: ConfirmEmail,
    title: 'تأكيد البريد الإلكتروني | SafeTrace'
  },
  { 
    path: 'forgot-password', 
    component: ResetPassword,
    title: 'استعادة كلمة المرور | SafeTrace'
  }
];