/**
 * @file utente.service.ts
 * @description Servizio Angular per la gestione delle operazioni relative all'utente.
 * Gestisce le chiamate HTTP agli endpoint /api/auth del backend per operazioni come la progressione e il completamento dei sentieri.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';

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

@Injectable({ providedIn: 'root' })
export class UtenteService {

  private apiUrl = 'http://localhost:3000/api/auth';
  private http    = inject(HttpClient);
  private authSvc = inject(AuthService);

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
}