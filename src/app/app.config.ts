import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject } from '@angular/core';
import { SocialAuthServiceConfig, GoogleLoginProvider, FacebookLoginProvider, SOCIAL_AUTH_CONFIG } from '@abacritt/angularx-social-login';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar';
import { environment } from '../environments/environment.development';
import { AuthService } from './core/services/auth.service';

registerLocaleData(localeAr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    
    {
      provide: SOCIAL_AUTH_CONFIG, 
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(environment.googleClientId)
          },
          {
            id: FacebookLoginProvider.PROVIDER_ID,
            provider: new FacebookLoginProvider(environment.facebookAppId) 
          }
        ],
        onError: (err) => {
          console.error(err);
        }
      } as SocialAuthServiceConfig,
    },
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.checkSession();
    }),
  ],
};