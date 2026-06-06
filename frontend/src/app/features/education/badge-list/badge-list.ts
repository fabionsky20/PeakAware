/**
 * @file badge-list.ts
 * @description Componente profilo badge utente.
 * Mostra tutti i badge disponibili con percentuale di avanzamento.
 * Badge al 100% risultano colorati, gli altri in grigio.
 * I badge ottenuti vengono usati dal Cicerone per personalizzare i consigli.
 * Implementa US-15.
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '@env';

interface CondizioneBadge {
  tipo: 'punti' | 'categoria';
  sogliaPunti?: number;
  categorie?: string[];
}

interface Badge {
  _id: string;
  nome: string;
  descrizione: string;
  icona: string;
  condizione: CondizioneBadge;
  percentuale: number;
  ottenuto: boolean;
}

@Component({
  selector: 'app-badge-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge-list.html',
  styleUrl: './badge-list.css'
})
export class BadgeList implements OnInit {

  badges: Badge[] = [];
  caricamento: boolean = true;
  errore: string = '';
  ruoloUtente: string = '';

  private apiUrl = environment.apiUrl + '/api/educazione';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAutenticato()) {
      this.router.navigate(['/login']);
      return;
    }
    this.ruoloUtente = this.authService.getRuolo?.() ?? '';
    this.caricaBadge();
  }

  private caricaBadge(): void {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });

    this.http.get<any>(`${this.apiUrl}/badge`, { headers }).subscribe({
      next: (risposta) => {
        this.badges = risposta.dati || [];
        this.caricamento = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errore = 'Errore nel caricamento dei badge.';
        this.caricamento = false;
        this.cdr.detectChanges();
      }
    });
  }

  get badgeOttenuti(): number {
    return this.badges.filter(b => b.ottenuto).length;
  }

  /** Testo descrittivo della condizione per mostrarlo all'utente. */
  testoCondizione(b: Badge): string {
    if (b.condizione.tipo === 'punti') {
      return `Raggiungi ${b.condizione.sogliaPunti} punti`;
    }
    if (b.condizione.tipo === 'categoria') {
      const cat = (b.condizione.categorie ?? []).join(', ');
      return `Completa tutti i quiz: ${cat}`;
    }
    return '';
  }

  isAdmin(): boolean {
    return this.ruoloUtente === 'admin';
  }

  nuovoBadge(): void {
    this.router.navigate(['/admin/badge-form']);
  }

  modificaBadge(id: string): void {
    this.router.navigate(['/admin/badge-form', id]);
  }

  eliminaBadge(id: string): void {
    if (!confirm('Eliminare questo badge?')) return;
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });

    this.http.delete<any>(`${this.apiUrl}/badge/${id}`, { headers }).subscribe({
      next: () => {
        this.badges = this.badges.filter(b => b._id !== id);
        this.cdr.detectChanges();
      },
      error: () => alert('Errore nell\'eliminazione del badge.')
    });
  }

  torna(): void {
    this.router.navigate(['/educazione/quiz']);
  }
}
