/**
 * @file badge-form.ts
 * @description Form admin per creazione e modifica badge.
 * Permette di definire nome, descrizione, icona (emoji) e condizione di sblocco.
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-badge-form',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './badge-form.html',
  styleUrl: './badge-form.css'
})
export class BadgeForm implements OnInit {

  isModifica: boolean = false;
  badgeId: string | null = null;

  badge: any = {
    nome: '',
    descrizione: '',
    icona: '🏅',
    condizione: {
      tipo: 'categoria',
      sogliaPunti: 100,
      categorie: [] as string[],
    }
  };

  /** Categorie quiz disponibili */
  readonly CATEGORIE = ['meteo', 'valanghe', 'orientamento', 'fauna', 'prontoSoccorso', 'generale'];

  errore: string = '';
  successo: string = '';
  caricamento: boolean = false;

  private apiUrl = 'http://localhost:3000/api/educazione';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAutenticato()) {
      this.router.navigate(['/login']);
      return;
    }

    this.badgeId = this.route.snapshot.paramMap.get('id');
    if (this.badgeId) {
      this.isModifica = true;
      this.caricaBadge();
    }
  }

  private caricaBadge(): void {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });

    this.http.get<any>(`${this.apiUrl}/badge`, { headers }).subscribe({
      next: (risposta) => {
        const trovato = (risposta.dati || []).find((b: any) => b._id === this.badgeId);
        if (trovato) {
          this.badge = {
            ...trovato,
            condizione: {
              tipo: trovato.condizione?.tipo ?? 'categoria',
              sogliaPunti: trovato.condizione?.sogliaPunti ?? 100,
              categorie: trovato.condizione?.categorie ?? [],
            }
          };
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.errore = 'Errore nel caricamento del badge.';
        this.cdr.detectChanges();
      }
    });
  }

  /** Aggiunge o rimuove una categoria dalla selezione multipla. */
  toggleCategoria(cat: string): void {
    const idx = this.badge.condizione.categorie.indexOf(cat);
    if (idx === -1) {
      this.badge.condizione.categorie = [...this.badge.condizione.categorie, cat];
    } else {
      this.badge.condizione.categorie = this.badge.condizione.categorie.filter((c: string) => c !== cat);
    }
  }

  categoriaSelezionata(cat: string): boolean {
    return this.badge.condizione.categorie.includes(cat);
  }

  salva(): void {
    this.errore = '';
    this.successo = '';

    if (!this.badge.nome.trim()) {
      this.errore = 'Il nome è obbligatorio.';
      return;
    }
    if (this.badge.condizione.tipo === 'categoria' && this.badge.condizione.categorie.length === 0) {
      this.errore = 'Seleziona almeno una categoria.';
      return;
    }
    if (this.badge.condizione.tipo === 'punti' && (!this.badge.condizione.sogliaPunti || this.badge.condizione.sogliaPunti <= 0)) {
      this.errore = 'Inserisci una soglia punti valida.';
      return;
    }

    this.caricamento = true;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const dati = {
      nome: this.badge.nome,
      descrizione: this.badge.descrizione,
      icona: this.badge.icona,
      condizione: this.badge.condizione.tipo === 'punti'
        ? { tipo: 'punti', sogliaPunti: this.badge.condizione.sogliaPunti }
        : { tipo: 'categoria', categorie: this.badge.condizione.categorie },
    };

    const richiesta = this.isModifica
      ? this.http.put<any>(`${this.apiUrl}/badge/${this.badgeId}`, dati, { headers })
      : this.http.post<any>(`${this.apiUrl}/badge`, dati, { headers });

    richiesta.subscribe({
      next: (risposta) => {
        this.caricamento = false;
        if (risposta.successo) {
          this.successo = this.isModifica ? 'Badge aggiornato!' : 'Badge creato!';
          setTimeout(() => this.router.navigate(['/educazione/badge']), 1200);
        }
      },
      error: (err) => {
        this.caricamento = false;
        this.errore = err.error?.messaggio || 'Errore nel salvataggio.';
      }
    });
  }

  annulla(): void {
    this.router.navigate(['/educazione/badge']);
  }
}
