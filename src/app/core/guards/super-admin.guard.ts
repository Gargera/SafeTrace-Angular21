import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SystemConstants } from '../constants/system.constants';

export const superAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser();
  
  if (currentUser?.email === SystemConstants.RootAdminEmail) {
    return true;
  }

  router.navigate(['/403']);
  return false;
};
