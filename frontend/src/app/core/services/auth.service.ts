/**
 * @file auth.service.ts
 * @description Servizio Angular per la gestione dell'autenticazione.
 * Gestisce le chiamate HTTP agli endpoint /api/auth del backend.
 * Corrisponde al componente Gestione Utenti del D2 sezione 1.3.
 */

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@env';

interface AuthResponse {
  successo: boolean;
  messaggio: string;
  dati?: {
    id: string;
    username: string;
    email: string;
    ruolo: string;
    punti: number;
    token: string;
  };
}

export interface UtenteCorrente {
  id: string;
  username: string;
  email: string;
  ruolo: string;
  punti: number;
  esperienza?: {
    livelloComplessivo: number;
    livelloTeorico: number;
    livelloPratico: number;
    kmTotali: number;
    dislivelloTotale: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = environment.apiUrl + '/api/auth';

  // Signal con i dati utente — null se non autenticato
  utente = signal<UtenteCorrente | null>(this.caricaDaLocalStorage());

  isAutenticato = computed(() => this.utente() !== null);
  isAdmin       = computed(() => this.utente()?.ruolo === 'admin');

  constructor(private http: HttpClient) {}

  registrati(username: string, email: string, password: string, eta?: number): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/registrati`, { username, email, password, eta }).pipe(
      tap(res => {
        if (res.successo && res.dati) {
          const u: UtenteCorrente = {
            id:       res.dati.id,
            username: res.dati.username,
            email:    res.dati.email,
            ruolo:    res.dati.ruolo,
            punti:    res.dati.punti,
          };
          localStorage.setItem('peakaware_token', res.dati.token);
          localStorage.setItem('peakaware_utente', JSON.stringify(u));
          this.utente.set(u);
        }
      })
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        if (res.successo && res.dati) {
          const u: UtenteCorrente = {
            id:       res.dati.id,
            username: res.dati.username,
            email:    res.dati.email,
            ruolo:    res.dati.ruolo,
            punti:    res.dati.punti,
          };
          localStorage.setItem('peakaware_token', res.dati.token);
          localStorage.setItem('peakaware_utente', JSON.stringify(u));
          this.utente.set(u);
        }
      })
    );
  }

  /**
   * Aggiorna il signal utente con i dati di progressione
   * (chiamato da UtenteService dopo aver caricato /api/auth/progressione)
   */
  aggiornaUtente(dati: Partial<UtenteCorrente>): void {
    const corrente = this.utente();
    if (!corrente) return;
    const aggiornato = { ...corrente, ...dati };
    localStorage.setItem('peakaware_utente', JSON.stringify(aggiornato));
    this.utente.set(aggiornato);
  }

  logout(): void {
    localStorage.removeItem('peakaware_token');
    localStorage.removeItem('peakaware_utente');
    this.utente.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('peakaware_token');
  }

  // Metodi legacy mantenuti per compatibilità
  salvaToken(token: string): void { localStorage.setItem('peakaware_token', token); }
  salvaEmail(email: string): void { localStorage.setItem('peakaware_email', email); }
  getEmail(): string { return this.utente()?.email ?? localStorage.getItem('peakaware_email') ?? ''; }
  getRuolo(): string { return this.utente()?.ruolo ?? 'utente'; }

  private caricaDaLocalStorage(): UtenteCorrente | null {
    try {
      const raw = localStorage.getItem('peakaware_utente');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}