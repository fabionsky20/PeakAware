import { Component, inject, computed, ViewChild, ViewChildren, QueryList, ElementRef, effect, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentieroService } from '@core/services/sentiero.service';
import { AuthService } from '@core/services/auth.service';
import { UtenteService } from '@core/services/utente.service';
import { valutaCompatibilita, ConsiglioSentiero } from '../trail-list/trail-advisor';
import { HttpClient } from '@angular/common/http';
import * as turf from '@turf/turf';

type StatoGps = 'inattivo' | 'avvio' | 'tracking' | 'completato' | 'errore';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})

export class SidebarComponent {
  protected sentieroService = inject(SentieroService);
  protected authService     = inject(AuthService);
  private   utenteService   = inject(UtenteService);
  private http = inject(HttpClient);

  isAdmin = computed(() => this.authService.getRuolo() === 'admin');
  importaLoading = false;
  importEsito: string | null = null;

  @ViewChild('sidebarScroll') sidebarScroll!: ElementRef<HTMLElement>;
  @ViewChildren('trailCard')  trailCards!: QueryList<ElementRef<HTMLElement>>;

  sentieriOrdinati = computed(() => [...this.sentieroService.sentieri()]);
  // ── Consiglio ──────────────────────────────────────────────────────────────

  consiglio = computed<ConsiglioSentiero | null>(() => {
    const s      = this.sentieroService.sentieroSelezionato();
    const utente = this.authService.utente();
    if (!s || !utente) return null;

    return valutaCompatibilita(
      s.properties?.['cai_scale'] ?? s.difficolta,
      s.lunghezza,
      s.dislivello_positivo,
      { livelloEsperienzaMontagna: utente.esperienza?.livelloComplessivo ?? 1 }
    );
  });

  // ── GPS tracking ───────────────────────────────────────────────────────────
  statoGps         = signal<StatoGps>('inattivo');
  nuoviBadge       = signal<{id:string; nome: string; icona: string; descrizione: string }[]>([]);
  messaggioGps     = signal<string>('');

  private watchId: number | null = null;
  private posizioniRaccolte: GeolocationPosition[] = [];
  private inizioTracking: number | null = null;

  get sentieroAttivo() { return this.sentieroService.sentieroSelezionato(); }

  avviaGps(): void {
    if (!navigator.geolocation) {
      this.statoGps.set('errore');
      this.messaggioGps.set('GPS non supportato dal browser');
      return;
    }

    this.statoGps.set('avvio');
    this.posizioniRaccolte = [];
    this.inizioTracking = Date.now();
    this.messaggioGps.set('Acquisizione segnale GPS...');

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.posizioniRaccolte.push(pos);
        this.statoGps.set('tracking');
        this.messaggioGps.set(
          `📍 Tracking attivo — ${this.posizioniRaccolte.length} punti registrati`
        );
      },
      (err) => {
        this.statoGps.set('errore');
        this.messaggioGps.set(`Errore GPS: ${err.message}`);
      },  { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }

  fermaGps(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    const s = this.sentieroAttivo

    if (!s || this.posizioniRaccolte.length < 2) {
      this.statoGps.set('inattivo');
      this.messaggioGps.set('');
      return;
    }

    // Calcola km percorsi dalla traccia GPS raccolta
    const coords = this.posizioniRaccolte.map(p => [
      p.coords.longitude, p.coords.latitude
    ]);
    const linea  = turf.lineString(coords);
    const km     = parseFloat(turf.length(linea, { units: 'kilometers' }).toFixed(2));
    const nome   = s.properties?.['name'] ?? 'Sentiero senza nome';

    this.statoGps.set('completato');
    this.messaggioGps.set(`Percorso completato — ${km} km registrati`);
    this.utenteService.completaSentiero(
      s.osm_id,
      nome,
      km,
      s.dislivello_positivo ?? 0
    ).subscribe({
      next: (res) => {
        if (res.nuoviBadge?.length > 0) {
          this.nuoviBadge.set(res.nuoviBadge);
          // Auto-nasconde i badge dopo 8 secondi
          setTimeout(() => this.nuoviBadge.set([]), 8000);
        }
      },
      error: () => this.messaggioGps.set('Percorso salvato localmente (errore server)')
    });
  }

  annullaGps(): void {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    this.statoGps.set('inattivo');
    this.messaggioGps.set('');
    this.posizioniRaccolte = [];
  }

  // ── Selezione e scroll ─────────────────────────────────────────────────────
  seleziona(sentiero: any): void {
    const corrente = this.sentieroService.sentieroSelezionato();
    if (corrente?.osm_id === sentiero.osm_id) {
      this.sentieroService.sentieroSelezionato.set(null);
      this.annullaGps();
    } else {
      this.sentieroService.sentieroSelezionato.set(sentiero);
      this.statoGps.set('inattivo');
      this.messaggioGps.set('');
    }
  }

  formatDurata(ore: any): string {
    if (ore == null) return '—';
    let totalMinuti: number;
    if (typeof ore === 'string' && ore.includes(':')) {
      const [h, m] = ore.split(':').map(Number);
      totalMinuti = h * 60 + m;
    } else {
      const n = parseFloat(ore);
      if (isNaN(n)) return '—';
      totalMinuti = Math.round(n * 60);
    }

    const h = Math.floor(totalMinuti / 60);
    const m = totalMinuti % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }

  getDifficultyLevel(scale: string | undefined): string {
    switch (scale?.toUpperCase()) {
      case 'T':   return 'easy';
      case 'E':   return 'medium';
      case 'EE':  return 'hard';
      case 'EEA': return 'expert';
      default:    return 'unknown';
    }
  }

  vaiAllaHome() {
    window.location.href = '/home';
  }

  ricaricaSentieri() {
    window.location.reload();
  }

  avviaImportazione() {
    this.importaLoading = true;
    this.importEsito = null;
    this.http.post('http://localhost:3000/api/sentieri/importa', {}, {headers: {Authorization: `Bearer ${this.authService.getToken()}`}}).subscribe({
      next: (data) => {
        this.importEsito = `✅ sentieri importati con successo`;
        this.importaLoading = false;
        this.ricaricaSentieri();
      },
      error: (error) => {
        this.importEsito = 'Errore durante l\'importazione.';
        this.importaLoading = false;
      }
    });
  }

  constructor() {
    // Carica progressione utente all'avvio se autenticato
    effect(() => {
      if (this.authService.isAutenticato()) {
       this.utenteService.caricaProgressione().subscribe();
      }
    });

    // Scroll alla card selezionata
    effect(() => {
      const selezionato = this.sentieroService.sentieroSelezionato();
      if (!selezionato) return;
      setTimeout(() => {
        const lista = this.sentieriOrdinati();
        const idx   = lista.findIndex(s => s.osm_id === selezionato.osm_id);
        const cards = this.trailCards?.toArray();
        if (idx > -1 && cards?.[idx]) {
          cards[idx].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    });
  }
}
