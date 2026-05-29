/**
 * @file video-form.ts
 * @description Form admin per creazione e modifica video educativi.
 * Implementa US-19 (aggiunta video con titolo, URL e metadati).
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-video-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './video-form.html',
  styleUrl: './video-form.css'
})
export class VideoForm implements OnInit {

  isModifica: boolean = false;
  videoId: string | null = null;

  video: any = {
    titolo: '',
    descrizione: '',
    url: '',
    entePubblicatore: 'PeakAware',
    argomento: '',
    modulo: 'educazione',
    livello: 1,
    durata: 0,
    tagInput: '',
  };

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

    this.videoId = this.route.snapshot.paramMap.get('id');
    if (this.videoId) {
      this.isModifica = true;
      this.caricaVideo();
    }
  }

  caricaVideo(): void {
    this.http.get<any>(`${this.apiUrl}/video/${this.videoId}`).subscribe({
      next: (risposta) => {
        if (risposta.successo) {
          const dati = risposta.dati;
          // Converte l'array tag in stringa per il campo di testo
          this.video = { ...dati, tagInput: (dati.tag || []).join(', ') };
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.errore = 'Errore nel caricamento del video';
        this.cdr.detectChanges();
      }
    });
  }

  salva(): void {
    this.errore = '';
    this.successo = '';
    this.caricamento = true;

    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    // Converte tagInput (stringa) in array, filtrando stringhe vuote
    const { tagInput, ...campi } = this.video;
    const dati = {
      ...campi,
      tag: tagInput
        ? tagInput.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        : [],
    };

    const richiesta = this.isModifica
      ? this.http.put<any>(`${this.apiUrl}/video/${this.videoId}`, dati, { headers })
      : this.http.post<any>(`${this.apiUrl}/video`, dati, { headers });

    richiesta.subscribe({
      next: (risposta) => {
        this.caricamento = false;
        if (risposta.successo) {
          this.successo = this.isModifica ? 'Video aggiornato!' : 'Video aggiunto!';
          setTimeout(() => this.router.navigate(['/educazione/video']), 1200);
        }
      },
      error: (err) => {
        this.caricamento = false;
        this.errore = err.error?.messaggio || 'Errore nel salvataggio del video';
        this.cdr.detectChanges();
      }
    });
  }

  annulla(): void {
    this.router.navigate(['/educazione/video']);
  }
}
