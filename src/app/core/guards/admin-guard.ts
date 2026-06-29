import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) 
  {
    return router.createUrlTree(['/auth'], { queryParams: { returnUrl: state.url } });
  }

  const token = authService.getToken();
  if (token) 
  {
    try 
    {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const roleClaim = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role;

      if (roleClaim === 'Admin' || (Array.isArray(roleClaim) && roleClaim.includes('Admin'))) 
      {
        return true;
      }
    } 
    catch (e) 
    {
      console.error('Error decoding token', e);
    }
  }

  return router.createUrlTree(['/403']);
};