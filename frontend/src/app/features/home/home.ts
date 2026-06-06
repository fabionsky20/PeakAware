/**
 * @file home.ts
 * @description Componente principale della dashboard utente.
 * Mostra punti, livello, quiz completati, sezione educativa, pianificazione
 * sentieri e carousel notizie. Ricarica i progressi ogni volta che
 * la rotta torna su /home (NavigationEnd).
 */
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ProfileButton } from '../sentieri/components/profile-button/profile-button';
import { environment } from '@env';

interface Notizia {
  _id: string;
  titolo: string;
  categoria: string;
  dataPubblicazione: string;
  contenuto?: { blocks?: { type: string; data?: { file?: { url?: string } } }[] };
}

interface LivelloDB {
  _id: string;
  numero: number;
  nome: string;
  puntiNecessari: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProfileButton],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit, OnDestroy {

  punti = 0;
  livello = 1;
  numeroQuizCompletati = 0;
  notizie: Notizia[] = [];
  livelli: LivelloDB[] = [];
  carouselIdx = 0;
  quizDrawerOpen = false;

  // Background con immagine reale: path relativo a index.html, risolto dal browser
  // Angular 18: assets in public/ → serviti direttamente dalla root del dev-server
  readonly heroBg = [
    'linear-gradient(to bottom, rgba(31,66,64,0.45) 0%, rgba(31,66,64,0.05) 40%, rgba(31,66,64,0.88) 85%, #1f4240 100%)',
    'url(images/hero-mountain.jpg) center/cover no-repeat',
  ].join(', ');

  readonly notizieBg = [
    'linear-gradient(to bottom, #1f4240 0%, rgba(31,66,64,0.92) 22%, rgba(31,66,64,0.2) 48%, rgba(31,66,64,0.2) 75%, #1f4240 100%)',
    'url(images/notizie-mountain.jpg) center/cover no-repeat',
  ].join(', ');

  // Immagini di sfondo per le card, con overlay scuro per leggibilità
  readonly eduCardBg = [
    'linear-gradient(rgba(27,52,50,0.84), rgba(27,52,50,0.84))',
    'url(images/quiz-mountain.jpg) center/cover no-repeat',
  ].join(', ');

  readonly planCardBg = [
    'linear-gradient(rgba(27,52,50,0.84), rgba(27,52,50,0.84))',
    'url(images/escursione-mountain.jpg) center/cover no-repeat',
  ].join(', ');

  private navSub!: Subscription;

  private readonly cardColori: Record<string, { bg: string; accent: string }> = {
    'meteo':         { bg: 'linear-gradient(135deg,#0d2f3a,#1a5c6e)', accent: '#4CA8D0' },
    'fauna':         { bg: 'linear-gradient(135deg,#1a3d1a,#2d6e2d)', accent: '#4CAF82' },
    'valanghe':      { bg: 'linear-gradient(135deg,#2d1a0d,#6e4020)', accent: '#B97A53' },
    'orientamento':  { bg: 'linear-gradient(135deg,#1a1040,#3a2880)', accent: '#A09AE8' },
    'prontoSoccorso':{ bg: 'linear-gradient(135deg,#2d0d0d,#6e1a1a)', accent: '#EF6565' },
    'generale':      { bg: 'linear-gradient(135deg,#0d2f20,#185a38)', accent: '#4CAF82' },
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.caricaProgressi();
    this.caricaNotizie();
    this.caricaLivelli();

    this.navSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd && (e as NavigationEnd).urlAfterRedirects === '/home')
    ).subscribe(() => {
      this.caricaProgressi();
      this.caricaNotizie();
    });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  get username(): string {
    return this.authService.utente()?.username ?? '';
  }

  get iniziali(): string {
    const u = this.username;
    return u.length >= 2 ? u.substring(0, 2).toUpperCase() : u.toUpperCase();
  }

  get nomeLivello(): string {
    return this.livelli.find(l => l.numero === this.livello)?.nome ?? '';
  }

  get isMaxLivello(): boolean {
    if (this.livelli.length === 0) return false;
    return !this.livelli.find(l => l.numero === this.livello + 1);
  }

  private get livelloCorrente(): LivelloDB | undefined {
    return this.livelli.find(l => l.numero === this.livello);
  }

  private get livelloProssimo(): LivelloDB | undefined {
    return this.livelli.find(l => l.numero === this.livello + 1);
  }

  get puntiTargetLivello(): number {
    return this.livelloProssimo?.puntiNecessari ?? this.punti;
  }

  get percentualeLivello(): number {
    const curr = this.livelloCorrente;
    const next = this.livelloProssimo;
    if (!curr || !next) return 0;
    const range = next.puntiNecessari - curr.puntiNecessari;
    if (range <= 0) return 100;
    return Math.min(100, Math.round(((this.punti - curr.puntiNecessari) / range) * 100));
  }

  get puntiAlProssimo(): number {
    const next = this.livelloProssimo;
    return next ? Math.max(0, next.puntiNecessari - this.punti) : 0;
  }

  get carouselTranslate(): string {
    return `translateX(-${this.carouselIdx * 258}px)`;
  }

  get prevDisabled(): boolean {
    return this.carouselIdx === 0;
  }

  get nextDisabled(): boolean {
    return this.carouselIdx >= Math.max(0, this.notizie.length - 3);
  }

  cardBg(categoria: string): string {
    return (this.cardColori[categoria] ?? this.cardColori['generale']).bg;
  }

  cardAccent(categoria: string): string {
    return (this.cardColori[categoria] ?? this.cardColori['generale']).accent;
  }

  private caricaLivelli(): void {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    this.http.get<any>(environment.apiUrl + '/api/livelli', { headers }).subscribe({
      next: (res) => {
        this.livelli = (res.dati ?? []).sort((a: LivelloDB, b: LivelloDB) => a.puntiNecessari - b.puntiNecessari);
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  private caricaProgressi(): void {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    this.http.get<any>(environment.apiUrl + '/api/educazione/progressi', { headers }).subscribe({
      next: (res) => {
        if (res.successo) {
          this.punti = res.dati.punti;
          this.livello = res.dati.livello;
          this.numeroQuizCompletati = res.dati.numeroQuizCompletati ?? res.dati.quizCompletati?.length ?? 0;
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  private caricaNotizie(): void {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    this.http.get<any>(environment.apiUrl + '/api/cicerone/notizie', { headers }).subscribe({
      next: (res) => {
        this.notizie = (res.dati ?? []).slice(0, 6);
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  prevSlide(): void {
    if (!this.prevDisabled) this.carouselIdx--;
  }

  nextSlide(): void {
    if (!this.nextDisabled) this.carouselIdx++;
  }

  toggleDrawer(): void {
    this.quizDrawerOpen = !this.quizDrawerOpen;
  }

  vaiA(path: string): void {
    this.router.navigate([path]);
  }

  getPrimaImmagine(notizia: Notizia): string | null {
    const block = (notizia.contenuto?.blocks ?? []).find(b => b.type === 'image');
    return block?.data?.file?.url ?? null;
  }

  formatData(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
