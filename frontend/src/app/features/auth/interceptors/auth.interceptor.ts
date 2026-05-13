import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Recupera il token salvato durante il login
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