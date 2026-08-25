import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SnackbarService } from '../../shared/services/toast.service';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const snackbarService = inject(SnackbarService);

  const isApiRequest =
    request.url.startsWith(environment.apiBaseUrl) ||
    request.url.startsWith('/api') ||
    !request.url.startsWith('http');
  const isRefreshRequest = request.url.includes('/api/Account/refresh-token');
  const isGoogleMapsRequest = request.url.startsWith('https://maps.googleapis.com');

  if (!isApiRequest || isGoogleMapsRequest || isRefreshRequest || !authService.isLoggedIn()) {
    return next(request);
  }

  return from(authService.ensureValidAccessToken()).pipe(
    switchMap((token) => {
      const authenticatedRequest = token
        ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : request;

      return next(authenticatedRequest).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 429) {
            snackbarService.error(
              error.error?.detail ?? 'طلبات كثيرة جداً؛ يرجى الانتظار قبل المحاولة مرة أخرى.',
            );
            return throwError(() => error);
          }

          const hasRetried = authenticatedRequest.headers.has('X-Auth-Retry');
          if (error.status !== 401 || !token || hasRetried) {
            return throwError(() => error);
          }

          return from(authService.ensureValidAccessToken(true)).pipe(
            switchMap((refreshedToken) => {
              if (!refreshedToken) {
                return throwError(() => error);
              }

              return next(
                request.clone({
                  setHeaders: {
                    Authorization: `Bearer ${refreshedToken}`,
                    'X-Auth-Retry': '1',
                  },
                }),
              );
            }),
          );
        }),
      );
    }),
  );
};
