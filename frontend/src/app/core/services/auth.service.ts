/**
 * @file auth.service.ts
 * @description Servizio Angular per la gestione dell'autenticazione.
 * Gestisce le chiamate HTTP agli endpoint /api/auth del backend.
 * Corrisponde al componente Gestione Utenti del D2 sezione 1.3.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Interfaccia che rappresenta la risposta del backend dopo login/registrazione.
 */
interface AuthResponse {
  successo: boolean;
  messaggio: string;
  dati?: {
    id: string;
    email: string;
    ruolo: string;
    punti: number;
    token: string;
  };
}

@Injectable({
  providedIn: 'root' // Disponibile in tutta l'applicazione
})
export class AuthService {

  /** URL base del backend — corrisponde alla porta di Express */
  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  /**
   * Registra un nuovo utente sulla piattaforma.
   * Chiama POST /api/auth/registrati
   *
   * @param email - Email del nuovo utente
   * @param password - Password in chiaro
   * @param eta - Età opzionale
   * @returns Observable con la risposta del backend
   */
  registrati(email: string, password: string, eta?: number): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/registrati`, {
      email,
      password,
      eta
    });
  }

  /**
   * Autentica un utente esistente.
   * Chiama POST /api/auth/login
   *
   * @param email - Email dell'utente
   * @param password - Password in chiaro
   * @returns Observable con la risposta del backend incluso il token JWT
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, {
      email,
      password
    });
  }

  /**
   * Salva il token JWT nel localStorage dopo il login.
   *
   * @param token - Token JWT ricevuto dal backend
   */
  salvaToken(token: string): void {
    localStorage.setItem('peakaware_token', token);
  }

  /**
   * Recupera il token JWT dal localStorage.
   *
   * @returns Il token JWT o null se non presente
   */
  getToken(): string | null {
    return localStorage.getItem('peakaware_token');
  }

  /**
   * Rimuove il token dal localStorage — effettua il logout.
   */
  logout(): void {
    localStorage.removeItem('peakaware_token');
  }

  /**
   * Verifica se l'utente è autenticato controllando la presenza del token.
   *
   * @returns true se il token è presente, false altrimenti
   */
  isAutenticato(): boolean {
    return this.getToken() !== null;
  }

    /**
     * Legge il ruolo dell'utente dal token JWT salvato.
     * Decodifica il payload del token senza librerie esterne.
     *
     * @returns Il ruolo dell'utente ('utente' o 'admin') o 'utente' se non trovato
     */
    getRuolo(): string {
    const token = this.getToken();
    if (!token) return 'utente';

    try {
        // Il token JWT è diviso in tre parti da punti: header.payload.firma
        // Il payload è la seconda parte, codificato in base64
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.ruolo || 'utente';
    } catch {
        return 'utente';
    }
    }
}