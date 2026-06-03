/**
 * @file livelli-form.ts
 * @description Pannello admin per la gestione dei livelli di progressione.
 * Permette di modificare nome e soglia punti di ogni livello, aggiungerne
 * di nuovi ed eliminare quelli non di sistema. Il livello 1 non ha soglia
 * modificabile (è il punto di partenza).
 */
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

interface Livello {
  _id: string;
  numero: number;
  nome: string;
  puntiNecessari: number;
}

@Component({
  selector: 'app-livelli-form',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './livelli-form.html',
  styleUrl: './livelli-form.css'
})
export class LivelliForm implements OnInit {

  livelli: Livello[] = [];
  caricamento = false;
  errore = '';

  editingId: string | null = null;
  editNome = '';
  editPunti = 0;
  salvando = false;

  showNew = false;
  nuovoNome = '';
  nuovoPunti: number | null = null;
  aggiungendo = false;

  private readonly apiUrl = 'http://localhost:3000/api/livelli';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.caricaLivelli();
  }

  vaiA(path: string): void {
    this.router.navigate([path]);
  }

  caricaLivelli(): void {
    this.caricamento = true;
    this.errore = '';
    const headers = this.headers();
    this.http.get<any>(this.apiUrl, { headers }).subscribe({
      next: (res) => {
        this.livelli = res.dati ?? [];
        this.caricamento = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errore = 'Errore nel caricamento dei livelli.';
        this.caricamento = false;
        this.cdr.detectChanges();
      }
    });
  }

  startEdit(l: Livello): void {
    this.editingId = l._id;
    this.editNome  = l.nome;
    this.editPunti = l.puntiNecessari;
    this.showNew   = false;
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  salva(l: Livello): void {
    if (!this.editNome.trim()) return;
    this.salvando = true;
    const headers = this.headers();
    const body: any = { nome: this.editNome.trim() };
    if (l.numero !== 1) body.puntiNecessari = Number(this.editPunti);

    this.http.put<any>(`${this.apiUrl}/${l._id}`, body, { headers }).subscribe({
      next: () => {
        this.salvando = false;
        this.editingId = null;
        this.caricaLivelli();
      },
      error: () => {
        this.salvando = false;
        this.errore = 'Errore nel salvataggio.';
        this.cdr.detectChanges();
      }
    });
  }

  elimina(l: Livello): void {
    if (!confirm(`Eliminare il livello ${l.numero} "${l.nome}"?`)) return;
    const headers = this.headers();
    this.http.delete<any>(`${this.apiUrl}/${l._id}`, { headers }).subscribe({
      next: () => this.caricaLivelli(),
      error: (err) => {
        this.errore = err.error?.messaggio ?? 'Errore nella eliminazione.';
        this.cdr.detectChanges();
      }
    });
  }

  aggiungi(): void {
    if (!this.nuovoNome.trim() || this.nuovoPunti == null) return;
    this.aggiungendo = true;
    const headers = this.headers();
    this.http.post<any>(this.apiUrl, {
      nome: this.nuovoNome.trim(),
      puntiNecessari: Number(this.nuovoPunti)
    }, { headers }).subscribe({
      next: () => {
        this.aggiungendo = false;
        this.showNew    = false;
        this.nuovoNome  = '';
        this.nuovoPunti = null;
        this.caricaLivelli();
      },
      error: (err) => {
        this.aggiungendo = false;
        this.errore = err.error?.messaggio ?? 'Errore nella creazione.';
        this.cdr.detectChanges();
      }
    });
  }

  isLast(l: Livello): boolean {
    return l.numero === Math.max(...this.livelli.map(x => x.numero));
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }
}
