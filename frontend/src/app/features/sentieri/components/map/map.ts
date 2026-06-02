/**
 * @file map.ts
 * @description Componente mappa Leaflet. Sincronizzato con SentieroService via signal.
 */
import { Component, inject, effect, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtenteService } from '@core/services/utente.service';
import { SentieroService } from '@core/services/sentiero.service';
import { Sentiero } from '../../../../api';
import * as L from 'leaflet';
import { Subscription, interval, startWith, switchMap, catchError, of } from 'rxjs';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `<div #mapContainer id="map" class="map-container"></div>`,
  styles: [`.map-container, #map { height: 100%; width: 100%; }`]
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private sentieroService = inject(SentieroService);
  private utenteService   = inject(UtenteService);
  private authService     = inject(AuthService);

  private map!: L.Map;
  private geoJsonLayer!: L.FeatureGroup;
  // Mappa osm_id → { layer (polyline), marker }
  private layersLookup = new Map<string, { layer: L.GeoJSON; marker: L.Marker }>();
  private layerSelezionato: L.GeoJSON | null = null;

  // proprietà per il contatto di emergenza
  private contattoMarker: L.Marker | null = null;
  private trackingSubscription!: Subscription;

  // ─── STILI E ICONE ────────────────────────────────────────────────────────────
  private readonly STYLE_NORMAL   = { color: '#ff4500', weight: 4,  opacity: 0.8, dashArray: '' };
  private readonly STYLE_SELECTED = { color: '#007bff', weight: 8,  opacity: 1.0, dashArray: '' };
  private readonly STYLE_TRACKING = { color: '#16a34a', weight: 8,  opacity: 1.0, dashArray: '10, 10' }; // Verde tratteggiato per il tracking

  private markerPersonale: L.Marker | null = null;

  // Usa icone di base via CDN per distinguerle immediatamente senza impazzire coi file locali
  private iconaPersonale = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  });

  private iconaContatto = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
  });

  constructor() {
    // 1. Ricarica layer quando cambiano i dati
    effect(() => {
      const dati = this.sentieroService.sentieri();
      if (dati.length > 0 && this.map) this.updateMap(dati);
    });

    // 2. Sincronizza lo STILE (Sia per selezione che per tracciamento attivo)
    effect(() => {
      const selezionato = this.sentieroService.sentieroSelezionato();
      const tracciatoId = this.utenteService.sentieroInTracciamentoId();
      
      if (!this.map) return;

      // Resetta tutto a default
      this.layersLookup.forEach(({ layer }) => {
        layer.setStyle(this.STYLE_NORMAL);
      });
      this.layerSelezionato = null;

      // Applica stile Azzurro a quello che l'utente sta "sbirciando" nella sidebar
      if (selezionato) {
        const objSel = this.layersLookup.get(String(selezionato.osm_id));
        if (objSel) {
          this.layerSelezionato = objSel.layer;
          objSel.layer.setStyle(this.STYLE_SELECTED);
          objSel.layer.bringToFront();
        }
      }

      // Applica stile Verde (prevalente) a quello effettivamente in tracking
      if (tracciatoId) {
        const objTrac = this.layersLookup.get(String(tracciatoId));
        if (objTrac) {
          objTrac.layer.setStyle(this.STYLE_TRACKING);
          objTrac.layer.bringToFront();
        }
      }
    });

    // 3. Disegna e muovi il TUO marker personale in tempo reale
    effect(() => {
      const pos = this.utenteService.posizionePersonale();
      if (!this.map) return;

      if (pos) {
        if (this.markerPersonale) {
          // Muovi il marker esistente
          this.markerPersonale.setLatLng([pos.lat, pos.lng]);
        } else {
          // Crea il marker blu
          this.markerPersonale = L.marker([pos.lat, pos.lng], { icon: this.iconaPersonale, zIndexOffset: 1000 })
            .addTo(this.map)
            .bindPopup('<b>📍 La tua posizione</b>');

          // Apre il tracciato cliccando il marker
          this.markerPersonale.on('click', () => {
             const tId = this.utenteService.sentieroInTracciamentoId();
             if (tId) {
                 const trail = this.sentieroService.sentieri().find(s => String(s.osm_id) === String(tId));
                 if(trail) this.sentieroService.sentieroSelezionato.set(trail);
             }
          });
        }
      } else if (this.markerPersonale) {
        // Se fermi il tracking, togli il tuo marker
        this.map.removeLayer(this.markerPersonale);
        this.markerPersonale = null;
      }
    });
  }

  ngAfterViewInit() {
    this.initMap();
    this.sentieroService.loadSentieri();
    this.avviaTrackingContatto();
  }

  // Ecco la correzione per l'errore OnDestroy
  ngOnDestroy(): void {
    if (this.trackingSubscription) {
      this.trackingSubscription.unsubscribe();
    }
  }

  // ─── Setup mappa ────────────────────────────────────────────────────────────

  private initMap(): void {
    const iconDefault = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;

    this.map = L.map(this.mapContainer.nativeElement).setView([46.067, 11.121], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.geoJsonLayer = L.featureGroup().addTo(this.map);

    // Click sulla mappa vuota → deseleziona
    this.map.on('click', () => {
      this.resetSelezione();
    });

    setTimeout(() => this.map.invalidateSize(), 200);
  }

  // ─── Popolamento layer ───────────────────────────────────────────────────────

  private updateMap(sentieri: Sentiero[]): void {
    this.geoJsonLayer.clearLayers();
    this.layersLookup.clear();
    this.layerSelezionato = null;

    sentieri.forEach(s => {
      if (!s.geometry?.coordinates?.length) {
        console.warn('Sentiero senza geometria valida:', s.osm_id);
        return;
      }

      const layer = L.geoJSON(s.geometry as any, {
        style: this.STYLE_NORMAL
      }).addTo(this.geoJsonLayer);

      // Punto di partenza per il marker
      let startPoint: L.LatLngExpression | null = null;
      try {
        const coords = s.geometry.coordinates;
        if (s.geometry.type === 'LineString') {
          const p = coords[0] as unknown as number[];
          startPoint = [p[1], p[0]];
        } else if (s.geometry.type === 'MultiLineString') {
          const p = (coords[0] as unknown as number[][])[0];
          startPoint = [p[1], p[0]];
        }
      } catch {
        console.error('Errore coordinate per sentiero:', s.osm_id);
      }

      const marker = startPoint
        ? L.marker(startPoint).addTo(this.geoJsonLayer)
        : null;

      // FIX IMPORTANTISSIMO: Convertiamo osm_id a Stringa in modo forzato per evitare bug di lookup
      this.layersLookup.set(String(s.osm_id), { layer, marker: marker! });

      // Handler click condiviso tra layer e marker
      const onCLick = (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);

        if (this.sentieroService.sentieroSelezionato()?.osm_id === s.osm_id) {
          // Secondo click sullo stesso sentiero → deseleziona
          this.resetSelezione();
        } else {
          this.applicaSelezioneVisiva(layer, s, true);
        }
      };

      layer.on('click', onCLick);
      marker?.on('click', onCLick);
    });

    const bounds = this.geoJsonLayer.getBounds();
    if (bounds.isValid()) this.map.fitBounds(bounds, { padding: [30, 30] });
  }

  // ─── Gestione selezione ──────────────────────────────────────────────────────

  /** Evidenzia visivamente il layer e (opzionalmente) aggiorna il signal */
  private applicaSelezioneVisiva(
    layer: L.GeoJSON,
    s: Sentiero,
    aggiornaSegnale: boolean
  ): void {
    if (this.layerSelezionato === layer) return;

    this.resetSelezioneVisiva();

    this.layerSelezionato = layer;
    layer.setStyle(this.STYLE_SELECTED);
    layer.bringToFront();

    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    if (aggiornaSegnale) {
      this.sentieroService.sentieroSelezionato.set(s);
    }

    const nome = s.properties?.['name']
      ?? (s.properties?.['ref'] ? 'Sentiero ' + s.properties?.['ref'] : 'Sentiero senza nome');

    L.popup()
      .setLatLng(bounds.getCenter())
      .setContent(`<b>${nome}</b>`)
      .openOn(this.map);
  }

  /** Ripristina solo lo stile visivo, senza toccare il signal */
  private resetSelezioneVisiva(): void {
    if (this.layerSelezionato) {
      this.layerSelezionato.setStyle(this.STYLE_NORMAL);
      this.layerSelezionato = null;
    }
    this.map?.closePopup();
  }

  /** Reset completo: stile + signal */
  private resetSelezione(): void {
    this.resetSelezioneVisiva();
    this.sentieroService.sentieroSelezionato.set(null);
  }

  // ── Logica di visualizzazione real-time ──────────────────────────────────────
  private avviaTrackingContatto(): void {
    if (!this.authService.isAutenticato()) return;

    this.trackingSubscription = interval(30000).pipe(
      startWith(0),
      switchMap(() => this.utenteService.getPosizioneContatto().pipe(
         // CRITICO: Impedisce che un errore di rete uccida il timer
         catchError(() => of(null))
      ))
    ).subscribe({
      next: (dati) => {
        if (dati && dati.successo && dati.coordinate && dati.coordinate.lat != null) {
          const { lat, lng } = dati.coordinate;
          const ora = new Date(dati.ultimoAggiornamento).toLocaleTimeString();
          const popupTxt = `<b>🆘 Contatto: ${dati.username}</b><br>Ultima posizione alle: ${ora}`;

          if (this.contattoMarker) {
            this.contattoMarker.setLatLng([lat, lng]);
            this.contattoMarker.getPopup()?.setContent(popupTxt);
          } else {
            this.contattoMarker = L.marker([lat, lng], { icon: this.iconaContatto, zIndexOffset: 900 })
              .addTo(this.map)
              .bindPopup(popupTxt);
              
            // NUOVO: Seleziona in automatico il sentiero del contatto
            this.contattoMarker.on('click', () => {
               if (dati.sentieroId) {
                   const trail = this.sentieroService.sentieri().find(s => String(s.osm_id) === String(dati.sentieroId));
                   if (trail) {
                     this.sentieroService.sentieroSelezionato.set(trail);
                   }
               }
            });
          }
        } else if (this.contattoMarker) {
          this.map.removeLayer(this.contattoMarker);
          this.contattoMarker = null;
        }
      }
    });
  }
}