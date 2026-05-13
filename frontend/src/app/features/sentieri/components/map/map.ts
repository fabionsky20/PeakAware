/**
 * @file map.ts
 * @description Componente mappa Leaflet. Sincronizzato con SentieroService via signal.
 */
import { Component, inject, effect, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentieroService } from '@core/services/sentiero.service';
import { Sentiero } from '../../../../api';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `<div #mapContainer id="map" class="map-container"></div>`,
  styles: [`.map-container, #map { height: 100%; width: 100%; }`]
})
export class MapComponent implements AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private sentieroService = inject(SentieroService);
  private map!: L.Map;
  private geoJsonLayer!: L.FeatureGroup;

  // Mappa osm_id → { layer (polyline), marker }
  private layersLookup = new Map<string, { layer: L.GeoJSON; marker: L.Marker }>();
  private layerSelezionato: L.GeoJSON | null = null;

  private readonly STYLE_NORMAL  = { color: '#ff4500', weight: 4,  opacity: 0.8 };
  private readonly STYLE_SELECTED = { color: '#007bff', weight: 8, opacity: 1.0 };

  constructor() {
    // Ricarica layer quando cambiano i dati
    effect(() => {
      const dati = this.sentieroService.sentieri();
      if (dati.length > 0 && this.map) this.updateMap(dati);
    });

    // Sincronizza stile visivo quando la selezione cambia (es. click da sidebar)
    effect(() => {
      const selezionato = this.sentieroService.sentieroSelezionato();
      if (!this.map) return;

      if (!selezionato) {
        this.resetSelezioneVisiva();
        return;
      }

      const obj = this.layersLookup.get(selezionato.osm_id);
      if (obj) {
        this.applicaSelezioneVisiva(obj.layer, selezionato, false);
      }
    });
  }

  ngAfterViewInit() {
    this.initMap();
    this.sentieroService.loadSentieri();
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

      // Salva nel lookup PRIMA di collegare eventi
      this.layersLookup.set(s.osm_id, { layer, marker: marker! });

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
}