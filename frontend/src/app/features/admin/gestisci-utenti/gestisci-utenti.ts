/**
 * @file gestisci-utenti.ts
 * @description Pannello admin per la gestione degli account utente.
 * Permette di cercare per username/email, eliminare account e promuovere
 * utenti al ruolo admin. Accessibile solo agli admin.
 */
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '@env';

interface UtenteRiga {
  _id: string;
  username: string;
  email: string;
  ruolo: 'utente' | 'admin';
  createdAt?: string;
}

@Component({
  selector: 'app-gestisci-utenti',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestisci-utenti.html',
  styleUrl: './gestisci-utenti.css'
})
export class GestisciUtenti implements OnInit {

  utenti: UtenteRiga[] = [];
  caricamento = false;
  errore = '';
  ricerca = '';

  eliminandoId: string | null = null;
  promuovendoId: string | null = null;

  private readonly apiUrl = environment.apiUrl + '/api/admin';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.caricaUtenti();
  }

  vaiA(path: string): void {
    this.router.navigate([path]);
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  caricaUtenti(): void {
    this.caricamento = true;
    this.errore = '';
    const params = this.ricerca.trim() ? `?q=${encodeURIComponent(this.ricerca.trim())}` : '';
    this.http.get<any>(`${this.apiUrl}/utenti${params}`, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.utenti = res.dati ?? [];
        this.caricamento = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errore = 'Errore nel caricamento degli utenti.';
        this.caricamento = false;
        this.cdr.detectChanges();
      }
    });
  }

  elimina(utente: UtenteRiga): void {
    if (!confirm(`Eliminare l'account di "${utente.username}" (${utente.email})?`)) return;
    this.eliminandoId = utente._id;
    this.http.delete<any>(`${this.apiUrl}/utenti/${utente._id}`, { headers: this.headers() }).subscribe({
      next: () => {
        this.eliminandoId = null;
        this.utenti = this.utenti.filter(u => u._id !== utente._id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.eliminandoId = null;
        this.errore = err.error?.messaggio || 'Errore durante l\'eliminazione.';
        this.cdr.detectChanges();
      }
    });
  }

  promuovi(utente: UtenteRiga): void {
    if (!confirm(`Promuovere "${utente.username}" ad admin?`)) return;
    this.promuovendoId = utente._id;
    this.http.put<any>(`${this.apiUrl}/utenti/${utente._id}/promuovi`, {}, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.promuovendoId = null;
        const idx = this.utenti.findIndex(u => u._id === utente._id);
        if (idx !== -1) this.utenti[idx] = { ...this.utenti[idx], ruolo: 'admin' };
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.promuovendoId = null;
        this.errore = err.error?.messaggio || 'Errore durante la promozione.';
        this.cdr.detectChanges();
      }
    });
  }

  idUtenteCorrente(): string {
    return this.authService.utente()?.id ?? '';
  }

  formatData(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
