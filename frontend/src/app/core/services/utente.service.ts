/**
 * @file utente.service.ts
 * @description Servizio Angular per la gestione delle operazioni relative all'utente.
 * Gestisce le chiamate HTTP agli endpoint /api/auth del backend per operazioni come la progressione e il completamento dei sentieri.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, EMPTY, throwError,catchError } from 'rxjs';
import { environment } from '@env';
import { AuthService } from './auth.service';
import { signal } from '@angular/core';

export interface ProgressioneResponse {
  livelloComplessivo: number;
  livelloTeorico: number;
  livelloPratico: number;
  puntiQuiz: number;
  kmTotali: number;
  dislivelloTotale: number;
  sentieriPercorsi: number;
  quizCompletati: number;
  badges: { id: string; sbloccatoIl: string }[];
  punti: number;
}

export interface CompletaSentieroResponse {
  message: string;
  esperienza: {
    livelloPratico: number;
    livelloComplessivo: number;
    kmTotali: number;
    dislivelloTotale: number;
  };
  nuoviBadge: { id: string; nome: string; descrizione: string; icona: string }[];
}

export interface ContattoEmergenza {
  nome: string;
  telefono: string;
  emailRegistrata?: string;
  condividiItinerario: boolean;
}

export interface LiveLocationPayload {
  isAttiva: boolean;
  lat?: number;
  lng?: number;
  sentieroId?: string;
  nomeSentiero?: string;
}
export interface PosizioneContattoResponse {
  successo: boolean;
  username: string;
  coordinate: {
    lat: number;
    lng: number;
  };
  ultimoAggiornamento: string;
  sentieroId?: string;
}

@Injectable({ providedIn: 'root' })
export class UtenteService {

  private apiUrl = environment.apiUrl + '/api/auth';
  private http    = inject(HttpClient);
  private authSvc = inject(AuthService);
  public posizionePersonale = signal<{lat: number, lng: number} | null>(null);
  public sentieroInTracciamentoId = signal<string | null>(null);

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authSvc.getToken()}` });
  }

  /** Carica la progressione completa e aggiorna il signal utente */
  caricaProgressione(): Observable<ProgressioneResponse> {
    return this.http.get<ProgressioneResponse>(
      `${this.apiUrl}/progressione`,
      { headers: this.headers }
    ).pipe(
      tap(p => this.authSvc.aggiornaUtente({ esperienza: {
        livelloComplessivo: p.livelloComplessivo,
        livelloTeorico:     p.livelloTeorico,
        livelloPratico:     p.livelloPratico,
        kmTotali:           p.kmTotali,
        dislivelloTotale:   p.dislivelloTotale,
      }}))
    );
  }

  /** Registra un sentiero come percorso */
  completaSentiero(
    osm_id: string,
    nome: string,
    km: number,
    dislivello: number
  ): Observable<CompletaSentieroResponse> {
    return this.http.post<CompletaSentieroResponse>(
      `${this.apiUrl}/sentiero`,
      { osm_id, nome, km, dislivello },
      { headers: this.headers }
    ).pipe(
      tap(res => this.authSvc.aggiornaUtente({ esperienza: {
        ...this.authSvc.utente()?.esperienza,
        livelloComplessivo: res.esperienza.livelloComplessivo,
        livelloPratico:     res.esperienza.livelloPratico,
        kmTotali:           res.esperienza.kmTotali,
        dislivelloTotale:   res.esperienza.dislivelloTotale,
      } as any}))
    );
  }
  private offlineBuffer: LiveLocationPayload[] = [];

aggiornaContatto(contatto: ContattoEmergenza): Observable<any> {
  return this.http.put(`${this.apiUrl}/contatto-emergenza`, contatto, { headers: this.headers });
}

/** Invia la coordinata singola. Se fallisce, la archivia localmente */
inviaPosizioneLive(payload: LiveLocationPayload): Observable<any> {
  // Se non è autenticato, interrompe restituendo un Observable vuoto
  // in modo che il subscribe() nella sidebar non vada in errore
  if (!this.authSvc.isAutenticato()) return EMPTY;

  // Aggiungiamo il 'return' e usiamo pipe() per gestire gli effetti collaterali
  return this.http.post(`${this.apiUrl}/tracking-live`, payload, { headers: this.headers })
    .pipe(
      tap(() => {
        // Corrisponde al tuo "next" originale: 
        // L'invio ha successo, quindi svuotiamo il buffer offline
        if (this.offlineBuffer.length > 0) {
          this.svuotaBufferOffline();
        }
      }),
      catchError((error) => { 
        // Mancanza di rete, memorizziamo l'ultimo punto utile
        if (payload.isAttiva) {
          this.offlineBuffer.push(payload);
        }
        // Rilanciamo l'errore verso il componente così che la sidebar possa loggarlo
        return throwError(() => error);
      })
    );
}

/** Controlla la posizione condivisa da un amico che ci ha eletti come contatto d'emergenza */
ottieniPosizioneCondivisa(): Observable<any> {
  return this.http.get(`${this.apiUrl}/mappa-condivisa`, { headers: this.headers });
}

getPosizioneContatto(): Observable<PosizioneContattoResponse> {
  return this.http.get<PosizioneContattoResponse>(
    `${this.apiUrl}/mappa-condivisa`,
    { headers: this.headers }
  );
}

private svuotaBufferOffline(): void {
  if (this.offlineBuffer.length === 0) return;
  // Prende l'ultima coordinata registrata (la più recente e accurata)
  const ultimoPunto = this.offlineBuffer[this.offlineBuffer.length - 1];
  
  this.http.post(`${this.apiUrl}/tracking-live`, ultimoPunto, { headers: this.headers })
    .subscribe({
      next: () => this.offlineBuffer = []
    });
}
}