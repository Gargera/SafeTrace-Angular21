import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  inject,
} from '@angular/core';
import {
  SocialAuthServiceConfig,
  GoogleLoginProvider,
  SOCIAL_AUTH_CONFIG,
} from '@abacritt/angularx-social-login';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { registerLocaleData } from '@angular/common';
import { globalLoadingInterceptor } from './core/interceptors/global-loading.interceptor';
import localeAr from '@angular/common/locales/ar';
import { environment } from '../environments/environment';
import { AuthService } from './core/services/auth.service';

registerLocaleData(localeAr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([jwtInterceptor, globalLoadingInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),

    {
      provide: SOCIAL_AUTH_CONFIG,
      useValue: {
        autoLogin: false,
        lang: 'ar',
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(environment.googleClientId, {
              oneTapEnabled: false,
            }),
          },
        ],
        onError: (err) => {
          console.error(err);
        },
      } as SocialAuthServiceConfig,
    },
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.checkSession();
    }),
  ],
};
