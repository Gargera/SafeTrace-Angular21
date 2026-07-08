import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

import { environment } from '../../../environments/environment.development';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  const isApiUrl =
    req.url.includes(environment.apiBaseUrl) ||
    req.url.startsWith('/api') ||
    !req.url.startsWith('http');
  ///////////Edit by youseef
  const isGoogleMapsRequest = req.url.startsWith('https://maps.googleapis.com');
  ////////////////////////end
  let clonedReq = req;

  ///////////Edit by youseef

  if (
    token &&
    isApiUrl &&
    !isGoogleMapsRequest &&
    !req.url.includes('/login') &&
    !req.url.includes('/refresh-token')
  ) {
    clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // if (token && !req.url.includes('/login') && !req.url.includes('/refresh-token')) {
  //   clonedReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  // }
  /////////////////////////////////
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((res) => {
              ////////////////////Edit by youseef
              const newReq =
                isApiUrl && !isGoogleMapsRequest
                  ? req.clone({
                      setHeaders: {
                        Authorization: `Bearer ${res.data?.accessToken}`,
                      },
                    })
                  : req;
              ///////////////////////////
              isRefreshing = false;
              if (res.success && res.data) {
                refreshTokenSubject.next(res.data.accessToken);
                const newReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${res.data.accessToken}` },
                });
                return next(newReq);
              }
              return throwError(() => new Error('Refresh failed'));
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              authService.clearSession();
              router.navigate(['/auth']);
              return throwError(() => refreshErr);
            }),
          );
        } else {
          return refreshTokenSubject.pipe(
            filter((newToken) => newToken !== null),
            take(1),
            switchMap((newToken) => {
              ////////////////edit by youseef
              const newReq =
                isApiUrl && !isGoogleMapsRequest
                  ? req.clone({
                      setHeaders: {
                        Authorization: `Bearer ${newToken}`,
                      },
                    })
                  : req;
              ///////////////////////////

              //const newReq = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
              return next(newReq);
            }),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};
