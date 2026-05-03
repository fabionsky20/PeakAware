/**
 * @file auth.guard.ts
 * @description Guard Angular per proteggere le route del modulo /educazione/*.
 * Reindirizza al login gli utenti non autenticati.
 * Corrisponde all'interfaccia "Autenticazione e autorizzazione" del D2 sezione 1.3.
 * Implementa US-20 (redirect al login per route protette).
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard funzionale che verifica se l'utente è autenticato.
 * Se il token JWT è assente, reindirizza alla pagina di login.
 *
 * @returns true se autenticato, UrlTree verso /login altrimenti
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAutenticato()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
