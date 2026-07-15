import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SnackbarService } from '../services/toast.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

import { environment } from '../../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const snackbarService = inject(SnackbarService);
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
      if (error.status === 429) {
        const errorMessage = error.error?.detail || 'طلبات كثيرة جداً: لقد تجاوزت الحد المسموح به من الطلبات. يرجى الانتظار.';
        snackbarService.error(errorMessage);
        return throwError(() => error);
      }

      if (error.status === 401 && token && !req.url.includes('/refresh-token')) {
        const expirationString = authService.getRefreshTokenExpiration();
        if (expirationString) {
          const expirationDate = new Date(expirationString);
          const now = new Date();

          if (now >= expirationDate) {
            Swal.fire({
              title: 'انتهت الجلسة',
              text: 'انتهت صلاحية الجلسة بالكامل، يرجى تسجيل الدخول من جديد.',
              icon: 'warning',
              confirmButtonText: 'تسجيل الدخول',
              confirmButtonColor: '#091426',
              allowOutsideClick: false,
              customClass: {
                popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl'
              }
            }).then(() => {
              authService.clearSession();
              router.navigate(['/auth']);
            });

            return throwError(() => new Error('انتهت صلاحية الجلسة بالكامل، يرجى تسجيل الدخول.'));
          }
        }

        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((res) => {
              isRefreshing = false;
              if (res.success && res.data) {
                refreshTokenSubject.next(res.data.accessToken);
                const retryReq =
                  isApiUrl && !isGoogleMapsRequest
                    ? req.clone({
                        setHeaders: {
                          Authorization: `Bearer ${res.data.accessToken}`,
                        },
                      })
                    : req;
                return next(retryReq);
              }
              return throwError(() => new Error('Refresh failed'));
            }),
            catchError((refreshErr) => {
              isRefreshing = false;

              Swal.fire({
                title: 'انتهت الجلسة',
                text: 'تم تسجيل الخروج لانتهاء الجلسة أو كإجراء أمني، يرجى تسجيل الدخول من جديد.',
                icon: 'warning',
                confirmButtonText: 'تسجيل الدخول',
                confirmButtonColor: '#091426',
                allowOutsideClick: false,
                customClass: {
                  popup: 'rounded-xl font-body-md border border-outline-variant shadow-xl'
                }
              }).then(() => {
                authService.clearSession();
                router.navigate(['/auth']);
              });

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
