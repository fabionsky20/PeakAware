/**
 * @file notizie-dett.ts
 * @description Componente pagina dettaglio notizia (/cicerone/notizia/:id).
 * Carica il contenuto EditorJS della notizia e la lista dei commenti
 * (delegata a NotizieComm). Renderizza i blocchi testo, intestazione e immagine.
 */
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '@env';
import { MobileNav } from '../../../shared/mobile-nav/mobile-nav';

interface EditorBlock {
  type: string;
  data: any;
}

interface EditorContent {
  time?: number;
  blocks: EditorBlock[];
  version?: string;
}

interface Notizia {
  _id: string;
  titolo: string;
  contenuto: EditorContent;
  categoria?: string;
  dataPubblicazione: string;
}

interface Commento {
  _id: string;
  autore: { _id: string; username: string };
  testo: string;
  dataCreazione: string;
}

@Component({
  selector: 'app-notizie-dett',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileNav],
  providers: [DatePipe],
  templateUrl: './notizie-dett.html',
  styleUrl: './notizie-dett.css'
})
export class NotizieDett implements OnInit {

  notizia: Notizia | null = null;
  errore: string | null = null;
  commenti: Commento[] = [];
  nuovoCommento = '';
  loadingCommenti = false;
  idUtenteLoggato = '';
  ruoloUtente = '';

  private readonly apiUrl = environment.apiUrl + '/api/cicerone';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.idUtenteLoggato = this.authService.utente()?.id ?? '';
    this.ruoloUtente = this.authService.getRuolo();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errore = 'ID notizia non trovato.';
      return;
    }
    this.caricaNotizia(id);
  }

  caricaNotizia(id: string): void {
    this.errore = null;
    this.notizia = null;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any>(`${this.apiUrl}/notizie/${id}`, { headers }).subscribe({
      next: (res) => {
        this.notizia = res.dati;
        this.caricaCommenti(id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.errore = 'Impossibile caricare la notizia.';
        this.cdr.detectChanges();
      }
    });
  }

  caricaCommenti(id: string): void {
    this.loadingCommenti = true;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<Commento[]>(`${this.apiUrl}/notizie/${id}/commenti`, { headers }).subscribe({
      next: (data) => {
        this.commenti = data;
        this.loadingCommenti = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingCommenti = false;
      }
    });
  }

  aggiungiCommento(): void {
    if (!this.nuovoCommento.trim() || !this.notizia) return;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.post(
      `${this.apiUrl}/notizie/${this.notizia._id}/commenti`,
      { testo: this.nuovoCommento },
      { headers }
    ).subscribe({
      next: () => {
        this.nuovoCommento = '';
        this.caricaCommenti(this.notizia!._id);
      },
      error: () => {}
    });
  }

  eliminaCommento(commentoId: string): void {
    if (!this.notizia) return;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.delete(
      `${this.apiUrl}/notizie/${this.notizia._id}/commenti/${commentoId}`,
      { headers }
    ).subscribe({
      next: () => this.caricaCommenti(this.notizia!._id),
      error: () => {}
    });
  }

  ricarica(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.caricaNotizia(id);
  }

  vaiHome(): void {
    this.router.navigate(['/home']);
  }

  tornaIndietro(): void {
    this.router.navigate(['/cicerone/notizie']);
  }

  // ── Helpers per il rendering delle immagini ──────────────────────────────────

  /** Stili inline per il <figure>: float sinistra/destra o blocco centrato */
  imageFigureStyle(data: any): Record<string, string> {
    const align: string = data?.align ?? 'center';
    if (align === 'left') {
      return { float: 'left', marginRight: '1.6em', marginBottom: '0.8em', marginTop: '0.3em' };
    }
    if (align === 'right') {
      return { float: 'right', marginLeft: '1.6em', marginBottom: '0.8em', marginTop: '0.3em' };
    }
    return { display: 'block', margin: '1.4em auto', textAlign: 'center' };
  }

  /** Stili inline per il <img>: max-width in base al preset di dimensione */
  imageStyle(data: any): Record<string, string> {
    const base: Record<string, string> = { borderRadius: '10px', display: 'block' };
    switch (data?.size as string) {
      case 'piccola':
        return { ...base, maxWidth: '240px',  width: 'auto'  };
      case 'media':
        return { ...base, maxWidth: '480px',  width: '100%'  };
      case 'grande':
        return { ...base, maxWidth: '800px',  width: '100%'  };
      default: // 'originale' o assente (retrocompatibile con vecchi blocchi)
        return { ...base, maxWidth: '100%',   width: 'auto'  };
    }
  }
}
