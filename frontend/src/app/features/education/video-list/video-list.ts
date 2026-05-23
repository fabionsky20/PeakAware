/**
 * @file video-list.ts
 * @description Componente VideoList di PeakAware.
 * Recupera e mostra la lista dei video educativi dal backend.
 * Supporta filtro per modulo (educazione / divulgazione).
 * Implementa US-11 (lista video), US-12 (filtro per modulo), US-13 (titolo, descrizione, durata).
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileButton } from '../../sentieri/components/profile-button/profile-button';

interface Video {
  _id: string;
  titolo: string;
  descrizione: string;
  url: string;
  entePubblicatore: string;
  argomento: string;
  modulo: 'educazione' | 'divulgazione';
  livello: number;
  durata: number;
}

@Component({
  selector: 'app-video-list',
  standalone: true,
  imports: [FormsModule, ProfileButton],
  templateUrl: './video-list.html',
  styleUrl: './video-list.css'
})
export class VideoList implements OnInit {

  video: Video[] = [];
  moduloSelezionato: string = '';
  caricamento: boolean = false;
  errore: string = '';
  ruoloUtente: string = 'utente';

  private apiUrl = 'http://localhost:3000/api/educazione';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.ruoloUtente = this.authService.getRuolo();
    this.caricaVideo();
  }

  caricaVideo(): void {
    this.caricamento = true;
    this.errore = '';

    let url = `${this.apiUrl}/video`;
    if (this.moduloSelezionato) {
      url += `?modulo=${this.moduloSelezionato}`;
    }

    this.http.get<any>(url).subscribe({
      next: (risposta) => {
        this.video = risposta.dati || [];
        this.caricamento = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.caricamento = false;
        this.errore = 'Errore nel caricamento dei video';
        this.cdr.detectChanges();
      }
    });
  }

  filtra(): void {
    this.caricaVideo();
  }

  apriVideo(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  vaiAiQuiz(): void {
    this.router.navigate(['/educazione/quiz']);
  }

  nuovoVideo(): void {
    this.router.navigate(['/admin/video-form']);
  }

  modificaVideo(id: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/admin/video-form', id]);
  }

  eliminaVideo(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Sei sicuro di voler eliminare questo video?')) return;

    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    this.http.delete<any>(`${this.apiUrl}/video/${id}`, { headers }).subscribe({
      next: () => this.caricaVideo(),
      error: () => alert('Errore nella eliminazione del video'),
    });
  }

  /**
   * US-13: Converte la durata in secondi in formato leggibile mm:ss o h:mm:ss.
   */
  formatDurata(secondi: number): string {
    if (!secondi || secondi <= 0) return '—';
    const h = Math.floor(secondi / 3600);
    const m = Math.floor((secondi % 3600) / 60);
    const s = secondi % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
