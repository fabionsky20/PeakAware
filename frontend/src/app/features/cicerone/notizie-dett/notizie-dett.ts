import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

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

@Component({
  selector: 'app-notizie-dett',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './notizie-dett.html',
  styleUrl: './notizie-dett.css'
})
export class NotizieDett implements OnInit {

  notizia: Notizia | null = null;
  errore: string | null = null;
  ultimoCommento: { autore: { _id: string, username: string }, testo: string } | null = null;

  private readonly apiUrl = 'http://localhost:3000/api/cicerone';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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
    this.caricaUltimoCommento();
    this.cdr.detectChanges(); 
    },
    error: (err) => {
      this.errore = 'Impossibile caricare la notizia.';
    }
  });
}

apriCommenti(id: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate([
        '/cicerone/notizie',
        id,
        'commenti'
    ]);
}

caricaUltimoCommento(): void {
  const token = this.authService.getToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  this.http.get<any>(`${this.apiUrl}/notizie/${this.notizia?._id}/commenti`, { headers }).subscribe({
    next: (data) => {
      const commenti = data;
      this.ultimoCommento = commenti.length > 0 ? commenti[commenti.length - 1] : null;
      this.cdr.detectChanges();
    }
  });
}

ricarica(): void {
  const id = this.route.snapshot.paramMap.get('id');
  if (id) this.caricaNotizia(id);
}

tornaIndietro(): void {
  this.router.navigate(['/cicerone/notizie']);
}

}