import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './features/auth/interceptors/auth.interceptor'; // Il tuo interceptor
import { BASE_PATH } from './api'; // Importa dal modulo generato
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])), // Necessario per chiamate HTTP al backend
    { provide: BASE_PATH, useValue: 'http://localhost:3000' }
  ]
};