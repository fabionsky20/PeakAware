/**
 * @file home.ts
 * @description Componente Home — pagina principale dopo il login.
 * Mostra le tre sezioni dell'applicazione (Educazione, Pianificazione, Cicerone)
 * e un pannello profilo con dati utente, progressi e cambio password.
 * Corrisponde al componente Gestione Utenti del D2 sezione 1.3.
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {

  email: string = '';
  ruolo: string = '';
  punti: number = 0;
  livello: number = 1;

  profiloAperto: boolean = false;
  cambiaPwAperto: boolean = false;

  pwAttuale: string = '';
  pwNuova: string = '';
  cambiaPwErrore: string = '';
  cambiaPwSuccesso: string = '';
  cambiaPwCaricamento: boolean = false;

  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.email = this.authService.getEmail();
    this.ruolo = this.authService.getRuolo();
    this.caricaProfilo();
  }

  /**
   * Restituisce la prima lettera dell'email da mostrare nel bottone profilo.
   *
   * @returns Iniziale maiuscola dell'email
   */
  get iniziale(): string {
    return this.email ? this.email[0].toUpperCase() : '?';
  }

  /**
   * Carica punti e livello dal backend tramite GET /api/auth/profilo.
   */
  private caricaProfilo(): void {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    this.http.get<any>(`${this.apiUrl}/profilo`, { headers }).subscribe({
      next: (risposta) => {
        if (risposta.successo) {
          this.punti = risposta.dati.punti;
          this.livello = risposta.dati.livello;
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  /**
   * Apre o chiude il pannello profilo laterale.
   */
  toggleProfilo(): void {
    this.profiloAperto = !this.profiloAperto;
    if (!this.profiloAperto) {
      this.cambiaPwAperto = false;
      this.resetCambiaPw();
    }
  }

  /**
   * Apre o chiude la sezione cambio password nel pannello profilo.
   */
  toggleCambiaPw(): void {
    this.cambiaPwAperto = !this.cambiaPwAperto;
    if (!this.cambiaPwAperto) this.resetCambiaPw();
  }

  /**
   * Invia la richiesta di cambio password al backend.
   * Rispetta il constraint OCL #3: nuova password ≠ attuale.
   */
  cambiaPassword(): void {
    this.cambiaPwErrore = '';
    this.cambiaPwSuccesso = '';

    if (!this.pwAttuale || !this.pwNuova) {
      this.cambiaPwErrore = 'Compila entrambi i campi.';
      return;
    }

    this.cambiaPwCaricamento = true;
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });

    this.http.put<any>(`${this.apiUrl}/cambia-password`, {
      passwordAttuale: this.pwAttuale,
      nuovaPassword: this.pwNuova
    }, { headers }).subscribe({
      next: (risposta) => {
        this.cambiaPwCaricamento = false;
        if (risposta.successo) {
          this.cambiaPwSuccesso = 'Password aggiornata con successo.';
          this.pwAttuale = '';
          this.pwNuova = '';
        } else {
          this.cambiaPwErrore = risposta.messaggio;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cambiaPwCaricamento = false;
        this.cambiaPwErrore = err.error?.messaggio || 'Errore durante il cambio password.';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Naviga verso una delle sezioni principali dell'app.
   *
   * @param path - Percorso di navigazione
   */
  vaiA(path: string): void {
    this.router.navigate([path]);
  }

  /**
   * Effettua il logout e torna al login.
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private resetCambiaPw(): void {
    this.pwAttuale = '';
    this.pwNuova = '';
    this.cambiaPwErrore = '';
    this.cambiaPwSuccesso = '';
    this.cambiaPwCaricamento = false;
  }
}
