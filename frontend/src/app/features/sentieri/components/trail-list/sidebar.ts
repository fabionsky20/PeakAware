/**
 * @file sidebar.ts
 * @description Sidebar della pagina Sentieri. Mostra lista sentieri, dettaglio,
 * consigli di compatibilità (trail-advisor) e suggerimenti attrezzatura
 * (equipment-advisor). Gestisce il tracciamento GPS live e il completamento
 * sentiero. Gli admin possono importare sentieri da OSM, cambiare visibilità
 * e configurare i parametri degli algoritmi.
 */
import {
  Component, inject, computed, OnInit,
  ViewChild, ViewChildren, QueryList, ElementRef, effect, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SentieroService } from '@core/services/sentiero.service';
import { AuthService } from '@core/services/auth.service';
import { UtenteService } from '@core/services/utente.service';
import { valutaCompatibilita, ConsiglioSentiero, TrailConfig } from './trail-advisor';
import { suggerisciAttrezzatura, SuggerimentoAttrezzatura, EquipConfig, EquipItem } from './equipment-advisor';
import * as turf from '@turf/turf';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

type StatoGps = 'inattivo' | 'avvio' | 'tracking' | 'completato' | 'errore';
type LivelloCAI = 'T' | 'E' | 'EE' | 'EEA';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnInit {
  protected sentieroService = inject(SentieroService);
  protected authService     = inject(AuthService);
  public    utenteSvc       = inject(UtenteService);
  private   router          = inject(Router);
  private   http            = inject(HttpClient);

  @ViewChild('sidebarScroll') sidebarScroll!: ElementRef<HTMLElement>;
  @ViewChildren('trailCard')  trailCards!: QueryList<ElementRef<HTMLElement>>;

  private apiUrl = 'http://localhost:3000/api';

  readonly livelliCai: LivelloCAI[] = ['T', 'E', 'EE', 'EEA'];

  sentieriOrdinati = computed(() => {
    const lista = [...this.sentieroService.sentieri()];
    if (!this.isAdmin()) {
      return lista.filter(s => s.isVisible !== false);
    }
    return lista;
  });

  // ── Admin: Importazione Geografica ────────────────────────────────────────
  importaLoading = false;
  importEsito    = '';
  showImportBar  = false;

  regioniPreimpostate = [
    { nome: 'Trentino (Intero)', bbox: '45.67,10.37,46.54,11.95' },
    { nome: 'Trento e Monte Bondone', bbox: '45.95,11.00,46.15,11.20' },
    { nome: 'Rovereto e Vallagarina', bbox: '45.75,10.90,45.95,11.10' },
    { nome: 'Alto Garda e Ledro', bbox: '45.80,10.70,45.95,11.00' },
    { nome: 'Val di Non', bbox: '46.25,10.90,46.45,11.20' },
    { nome: 'Val di Sole', bbox: '46.25,10.50,46.40,10.90' },
    { nome: 'Val di Fassa e Fiemme', bbox: '46.20,11.40,46.50,11.90' },
    { nome: 'Coordinate Manuali...', bbox: 'custom' }
  ];
  areaSelezionata = this.regioniPreimpostate[0].bbox;
  areaCustom = '';

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit() {
    this.sentieroService.loadSentieri();

    this.http.get(`${this.apiUrl}/config`).pipe(
      catchError((err) => {
        console.warn('Rotta config non pronta o errore DB. Uso configurazione base.', err);
        return of({});
      })
    ).subscribe({
      next: (res: any) => {
        if (res?.trailConfig) Object.assign(TrailConfig, res.trailConfig);
        if (res?.equipConfig?.soglie) Object.assign(EquipConfig.soglie, res.equipConfig.soglie);
        // Carica l'attrezzatura per livello dal DB, sovrascrivendo i default
        if (res?.equipConfig?.attrezzaturaPerLivello) {
          Object.assign(EquipConfig.attrezzaturaPerLivello, res.equipConfig.attrezzaturaPerLivello);
        }
      }
    });
  }

  vaiAllaHome(): void { this.router.navigate(['/home']); }
  ricaricaSentieri(): void { this.sentieroService.loadSentieri(); }
  toggleImportBar(): void { this.showImportBar = !this.showImportBar; }

  avviaImportazione(): void {
    const bboxToUse = this.areaSelezionata === 'custom' ? this.areaCustom : this.areaSelezionata;
    if (!bboxToUse) {
      this.importEsito = '❌ Inserisci un\'area valida';
      return;
    }

    this.importaLoading = true;
    this.importEsito    = '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });

    this.http.post<any>(`${this.apiUrl}/sentieri/importa`, { bbox: bboxToUse }, { headers }).subscribe({
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

  toggleVisibilita(sentiero: any, event: Event): void {
    event.stopPropagation();
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    const safeId = encodeURIComponent(String(sentiero.osm_id));

    this.http.patch(`${this.apiUrl}/sentieri/${safeId}/toggleVisibilita`, {}, { headers })
      .subscribe({
        next: (res: any) => {
          const listaAttuale = [...this.sentieroService.sentieri()];
          const index = listaAttuale.findIndex(s => s.osm_id === sentiero.osm_id);
          if (index !== -1) {
            listaAttuale[index] = { ...listaAttuale[index], isVisible: res.isVisible };
            this.sentieroService.sentieri.set(listaAttuale);
          }
        },
        error: (err) => {
          console.error('Errore modifica visibilità:', err);
          alert('Errore: impossibile cambiare la visibilità del sentiero.');
        }
      });
  }

  // ── Admin: Configurazione Algoritmi + Attrezzatura ───────────────────────
  configAperta = false;

  // Tab attiva nella sezione attrezzatura della modale
  livelloEquipSelezionato: LivelloCAI = 'T';

  configEdit: {
    requisitiCai: Record<string, number>;
    soglieEquip:  { lungaKm: number; impegnativaDPlus: number };
    attrezzaturaPerLivello: Record<string, SuggerimentoAttrezzatura[]>;
  } = {
    requisitiCai: { T: 1, E: 2, EE: 3, EEA: 5 },
    soglieEquip:  { lungaKm: 12, impegnativaDPlus: 600 },
    attrezzaturaPerLivello: { T: [], E: [], EE: [], EEA: [] }
  };

  apriConfig(): void {
    this.configEdit.requisitiCai           = { ...TrailConfig.requisitiCai };
    this.configEdit.soglieEquip            = { ...EquipConfig.soglie };
    // Deep copy per non mutare la config live finché non si salva
    this.configEdit.attrezzaturaPerLivello = JSON.parse(
      JSON.stringify(EquipConfig.attrezzaturaPerLivello)
    );
    this.livelloEquipSelezionato = 'T';
    this.configAperta = true;
  }

  salvaConfig(): void {
    // Aggiorna la config in-memory immediatamente
    Object.assign(TrailConfig.requisitiCai, this.configEdit.requisitiCai);
    Object.assign(EquipConfig.soglie, this.configEdit.soglieEquip);
    Object.assign(EquipConfig.attrezzaturaPerLivello, this.configEdit.attrezzaturaPerLivello);

    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    const payload = {
      trailConfig: TrailConfig,
      equipConfig: {
        soglie: EquipConfig.soglie,
        attrezzaturaPerLivello: EquipConfig.attrezzaturaPerLivello
      }
    };

    this.http.put(`${this.apiUrl}/config`, payload, { headers }).subscribe({
      next: () => {
        this.configAperta = false;
        alert('✅ Impostazioni salvate correttamente nel Database!');
      },
      error: () => alert('❌ Errore durante il salvataggio nel DB.')
    });
  }

  // ── Helper editor attrezzatura ────────────────────────────────────────────

  /** Aggiunge un item vuoto all'ultima categoria del livello selezionato */
  aggiungiItem(catIndex: number): void {
    this.configEdit.attrezzaturaPerLivello[this.livelloEquipSelezionato][catIndex]
      .items.push({ nome: '', obbligatorio: false });
  }

  /** Rimuove un item da una categoria del livello selezionato */
  rimuoviItem(catIndex: number, itemIndex: number): void {
    this.configEdit.attrezzaturaPerLivello[this.livelloEquipSelezionato][catIndex]
      .items.splice(itemIndex, 1);
  }

  /** Aggiunge una nuova categoria vuota al livello selezionato */
  aggiungiCategoria(): void {
    this.configEdit.attrezzaturaPerLivello[this.livelloEquipSelezionato]
      .push({ categoria: 'Nuova categoria', icona: '📦', items: [] });
  }

  /** Rimuove una categoria dal livello selezionato */
  rimuoviCategoria(catIndex: number): void {
    this.configEdit.attrezzaturaPerLivello[this.livelloEquipSelezionato]
      .splice(catIndex, 1);
  }

  // ── Computed signals ──────────────────────────────────────────────────────
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

  attrezzatura = computed<SuggerimentoAttrezzatura[]>(() => {
    const s = this.sentieroService.sentieroSelezionato();
    if (!s) return [];
    return suggerisciAttrezzatura(
      s.properties?.['cai_scale'] ?? s.difficolta,
      s.lunghezza,
      s.dislivello_positivo
    );
  });

  statoGps             = signal<StatoGps>('inattivo');
  nuoviBadge           = signal<{ id: string; nome: string; icona: string; descrizione: string }[]>([]);
  messaggioGps         = signal<string>('');
  sentieroCompletatoId = signal<string | null>(null);

  attrezzaturaAperta = false;
  toggleAttrezzatura(): void { this.attrezzaturaAperta = !this.attrezzaturaAperta; }

  private watchId: number | null = null;
  private posizioniRaccolte: GeolocationPosition[] = [];
  private liveTrackingInterval: any = null;
  private ultimaPosizioneRegistrata: GeolocationPosition | null = null;

  avviaGps(): void {
    this.sentieroCompletatoId.set(null);
    if (!navigator.geolocation) {
      this.statoGps.set('errore');
      this.messaggioGps.set('GPS non supportato dal browser');
      return;
    }

    const s = this.sentieroService.sentieroSelezionato();
    const nomeSentiero = s?.properties?.['name'] ?? 'Sentiero senza nome';
    const sentieroId   = s?.osm_id ?? '';

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

    this.liveTrackingInterval = setInterval(() => {
      if (this.ultimaPosizioneRegistrata) {
        this.inviaDatiLive(true, this.ultimaPosizioneRegistrata, sentieroId, nomeSentiero);
      }
    }, 300000);
  }

  private inviaDatiLive(isAttiva: boolean, pos: GeolocationPosition | null, sId: string, sNome: string): void {
    this.utenteSvc.inviaPosizioneLive({
      isAttiva, lat: pos?.coords.latitude, lng: pos?.coords.longitude,
      sentieroId: sId, nomeSentiero: sNome
    }).subscribe({
      next: () => console.log('[GPS] Inviato'),
      error: (err) => console.error('[GPS] Errore:', err)
    });
  }

  fermaGps(): void {
    const tracciatoId = this.utenteSvc.sentieroInTracciamentoId();
    this.sentieroCompletatoId.set(tracciatoId);

    this.pulisciTimerLive();
    this.inviaDatiLive(false, null, '', '');
    this.utenteSvc.posizionePersonale.set(null);
    this.utenteSvc.sentieroInTracciamentoId.set(null);

    if (this.watchId !== null) { navigator.geolocation.clearWatch(this.watchId); this.watchId = null; }

    const s = this.sentieroService.sentieroSelezionato();
    if (!s || this.posizioniRaccolte.length < 2) {
      this.statoGps.set('inattivo'); this.messaggioGps.set(''); return;
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
          if (err.status === 409) this.messaggioGps.set('⚠️ Hai già registrato questo sentiero oggi.');
          else this.messaggioGps.set('Percorso archiviato (in attesa di rete)');
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
    if (this.liveTrackingInterval) { clearInterval(this.liveTrackingInterval); this.liveTrackingInterval = null; }
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