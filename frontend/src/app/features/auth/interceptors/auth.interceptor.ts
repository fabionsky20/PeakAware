/**
 * @file auth.interceptor.ts
 * @description Interceptor HTTP funzionale che aggiunge l'header Authorization
 * a ogni richiesta uscente se è presente un token in localStorage.
 *
 * NOTA: la chiave usata qui ('token') non coincide con quella usata da AuthService
 * ('peakaware_token'). L'interceptor non aggiunge mai l'header in pratica;
 * i componenti impostano Authorization manualmente tramite HttpHeaders.
 */
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  // Se il token esiste, clona la richiesta aggiungendo l'header Authorization
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}` // Il formato atteso dal backend[cite: 5, 6]
      }
    });
    return next(authReq);
  }

  // Altrimenti prosegue con la richiesta originale (es. per il login pubblico)
  return next(req);
};