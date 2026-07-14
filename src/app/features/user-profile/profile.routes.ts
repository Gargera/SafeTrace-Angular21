import { Routes } from '@angular/router';
import { ProfileView } from './profile-view';
import { authGuard } from '../../core/guards/auth-guard';

export const PROFILE_ROUTES: Routes = [
  { 
    path: '', 
    canActivate: [authGuard],
    component: ProfileView
  },
];