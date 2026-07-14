import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    authService.clearSession();
    router.navigate(['/auth']);
    return false;
  }

  const expectedRoles = route.data['roles'] as Array<string>;

  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }

  const userRole = authService.getUserRole();
  const hasRole = userRole && expectedRoles.includes(userRole);

  if (!hasRole) {
    void router.navigate(['/403']);
    return false;
  }

  return true;
};