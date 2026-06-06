/**
 * @file app.config.ts
 * @description Configurazione radice dell'applicazione Angular.
 * Registra i provider globali: router con ripristino posizione scroll,
 * HttpClient con l'interceptor di autenticazione JWT e il BASE_PATH
 * per i servizi API auto-generati dall'OpenAPI spec.
 */

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './features/auth/interceptors/auth.interceptor'; // Il tuo interceptor
import { BASE_PATH } from './api'; // Importa dal modulo generato
import { routes } from './app.routes';
import { environment } from '@env';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling ({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([authInterceptor])), // Necessario per chiamate HTTP al backend
    { provide: BASE_PATH, useValue: environment.apiUrl }
  ]
};