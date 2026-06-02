import {
  Component, inject, computed,
  ViewChild, ViewChildren, QueryList, ElementRef, effect, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SentieroService } from '@core/services/sentiero.service';
import { AuthService } from '@core/services/auth.service';
import { UtenteService } from '@core/services/utente.service';
import { valutaCompatibilita, ConsiglioSentiero } from './trail-advisor';
import { suggerisciAttrezzatura, SuggerimentoAttrezzatura } from './equipment-advisor';
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
  public    utenteSvc       = inject(UtenteService); // Reso PUBLIC per l'HTML
  private   router          = inject(Router);
  private   http            = inject(HttpClient);

  @ViewChild('sidebarScroll') sidebarScroll!: ElementRef<HTMLElement>;
  @ViewChildren('trailCard')  trailCards!: QueryList<ElementRef<HTMLElement>>;

  private apiUrl = 'http://localhost:3000/api';

  sentieriOrdinati = computed(() => [...this.sentieroService.sentieri()]);

  // ── Admin ──────────────────────────────────────────────────────────────────
  importaLoading = false;
  importEsito    = '';

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  vaiAllaHome(): void {
    this.router.navigate(['/home']);
  }

  ricaricaSentieri(): void {
    this.sentieroService.loadSentieri();
  }

  avviaImportazione(): void {
    this.importaLoading = true;
    this.importEsito    = '';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`
    });
    this.http.post<any>(`${this.apiUrl}/sentieri/importa`, {}, { headers }).subscribe({
      next: (res) => {
        this.importaLoading = false;
        this.importEsito = `✅ ${res.dettagli?.salvati_filtrati ?? 0} sentieri importati`;
        this.sentieroService.loadSentieri();
      },
      error: () => {
        this.importaLoading = false;
        this.importEsito = '❌ Errore durante l\'importazione';
      }
    });
  }

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

  // ── Attrezzatura ──────────────────────────────────────────────────────────
  attrezzatura = computed<SuggerimentoAttrezzatura[]>(() => {
    const s = this.sentieroService.sentieroSelezionato();
    if (!s) return [];
    return suggerisciAttrezzatura(
      s.properties?.['cai_scale'] ?? s.difficolta,
      s.lunghezza,
      s.dislivello_positivo
    );
  });

  // ── GPS ────────────────────────────────────────────────────────────────────
  statoGps             = signal<StatoGps>('inattivo');
  nuoviBadge           = signal<{ id: string; nome: string; icona: string; descrizione: string }[]>([]);
  messaggioGps         = signal<string>('');
  sentieroCompletatoId = signal<string | null>(null);

  attrezzaturaAperta = false;

  toggleAttrezzatura(): void {
    this.attrezzaturaAperta = !this.attrezzaturaAperta;
  }

  private watchId: number | null = null;
  private posizioniRaccolte: GeolocationPosition[] = [];
  private liveTrackingInterval: any = null;
  private ultimaPosizioneRegistrata: GeolocationPosition | null = null;

  avviaGps(): void {
    this.sentieroCompletatoId.set(null); // Resetta esiti precedenti

    if (!navigator.geolocation) {
      this.statoGps.set('errore');
      this.messaggioGps.set('GPS non supportato dal browser');
      return;
    }

    const s = this.sentieroService.sentieroSelezionato();
    const nomeSentiero = s?.properties?.['name'] ?? 'Sentiero senza nome';
    const sentieroId = s?.osm_id ?? '';

    this.statoGps.set('avvio');
    this.posizioniRaccolte = [];
    this.messaggioGps.set('Acquisizione segnale GPS...');

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.posizioniRaccolte.push(pos);
        this.ultimaPosizioneRegistrata = pos;
        this.utenteSvc.posizionePersonale.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });

        if (this.statoGps() === 'avvio') {
          this.inviaDatiLive(true, pos, sentieroId, nomeSentiero);
          this.utenteSvc.sentieroInTracciamentoId.set(sentieroId);
        }
        this.statoGps.set('tracking');
        this.messaggioGps.set(`📍 Tracking attivo — ${this.posizioniRaccolte.length} punti`);
      },
      (err) => {
        this.statoGps.set('errore');
        this.messaggioGps.set(`Errore GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    // Timer di sincronizzazione: scatta ogni 5 minuti (300000 ms)
    this.liveTrackingInterval = setInterval(() => {
      if (this.ultimaPosizioneRegistrata) {
        this.inviaDatiLive(true, this.ultimaPosizioneRegistrata, sentieroId, nomeSentiero);
      }
    }, 300000);
  }

  private inviaDatiLive(isAttiva: boolean, pos: GeolocationPosition | null, sId: string, sNome: string): void {
    this.utenteSvc.inviaPosizioneLive({
      isAttiva,
      lat: pos ? pos.coords.latitude : undefined,
      lng: pos ? pos.coords.longitude : undefined,
      sentieroId: sId,
      nomeSentiero: sNome
    }).subscribe({
      next: () => console.log(`[GPS] Posizione inviata al server (isAttiva: ${isAttiva})`),
      error: (err) => console.error('[GPS] Errore invio posizione al server:', err)
    });
  }

  fermaGps(): void {
    const tracciatoId = this.utenteSvc.sentieroInTracciamentoId();
    this.sentieroCompletatoId.set(tracciatoId); // Associa il feedback al sentiero corretto
    
    this.pulisciTimerLive();
    this.inviaDatiLive(false, null, '', '');
    
    this.utenteSvc.posizionePersonale.set(null);
    this.utenteSvc.sentieroInTracciamentoId.set(null);

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    const s = this.sentieroService.sentieroSelezionato();
    if (!s || this.posizioniRaccolte.length < 2) {
      this.statoGps.set('inattivo');
      this.messaggioGps.set('');
      return;
    }
    const coords = this.posizioniRaccolte.map(p => [p.coords.longitude, p.coords.latitude]);
    const km     = parseFloat(turf.length(turf.lineString(coords), { units: 'kilometers' }).toFixed(2));
    const nome   = s.properties?.['name'] ?? 'Sentiero senza nome';

    this.statoGps.set('completato');
    this.messaggioGps.set(`Percorso completato — ${km} km registrati`);

    this.utenteSvc.completaSentiero(s.osm_id, nome, km, s.dislivello_positivo ?? 0)
      .subscribe({
        next: (res) => {
          if (res.nuoviBadge?.length > 0) {
            this.nuoviBadge.set(res.nuoviBadge);
            setTimeout(() => this.nuoviBadge.set([]), 8000);
          }
        },
        error: (err) => {
          if (err.status === 409) {
            this.messaggioGps.set('⚠️ Hai già registrato questo sentiero oggi.');
          } else {
            this.messaggioGps.set('Percorso archiviato (in attesa di rete)');
          }
        }
      });
  }

  annullaGps(): void {
    this.sentieroCompletatoId.set(null);
    this.pulisciTimerLive();
    this.inviaDatiLive(false, null, '', '');
    this.utenteSvc.posizionePersonale.set(null);
    this.utenteSvc.sentieroInTracciamentoId.set(null);

    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    this.statoGps.set('inattivo');
    this.messaggioGps.set('');
    this.posizioniRaccolte = [];
  }

  private pulisciTimerLive(): void {
    if (this.liveTrackingInterval) {
      clearInterval(this.liveTrackingInterval);
      this.liveTrackingInterval = null;
    }
  }

  seleziona(sentiero: any): void {
    const corrente = this.sentieroService.sentieroSelezionato();
    if (corrente?.osm_id === sentiero.osm_id) {
      this.sentieroService.sentieroSelezionato.set(null);
      this.attrezzaturaAperta = false;
    } else {
      this.sentieroService.sentieroSelezionato.set(sentiero);
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

  constructor() {
    effect(() => {
      if (this.authService.isAutenticato()) {
        this.utenteSvc.caricaProgressione().subscribe();
      }
    });

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