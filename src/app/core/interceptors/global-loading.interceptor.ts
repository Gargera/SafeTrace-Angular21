import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { GlobalLoadingService } from '../services/global-loading.service';

export const globalLoadingInterceptor: HttpInterceptorFn = (req, next) => {
  const globalLoadingService = inject(GlobalLoadingService);

  // You might want to skip some requests like polling from disabling everything
  // For now, intercept all
  globalLoadingService.startRequest();

  return next(req).pipe(
    finalize(() => {
      globalLoadingService.endRequest();
    })
  );
};
