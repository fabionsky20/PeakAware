/**
 * @file map.ts
 * @description Componente per la rappresentazione della mappa dei sentieri.
 * D2 dove?
 */

import { Component, inject, effect, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentieroService } from '@core/services/sentiero.service';
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
  private layerSelezionato: L.Layer | null = null;

  constructor() {
    effect(() => {
      const dati = this.sentieroService.sentieri();
      if(dati.length > 0 && this.map) this.updateMap(dati);
    });
  }

  ngAfterViewInit() {
    this.initMap();
    this.sentieroService.loadSentieri();
  }

  private initMap(): void {
    // Configurazione icone Leaflet[cite: 16]
    const iconDefault = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;

    this.map = L.map(this.mapContainer.nativeElement).setView([46.067, 11.121], 13); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.geoJsonLayer = L.featureGroup().addTo(this.map);

    // RESET: cliccando sulla mappa (vuoto) si torna allo stato iniziale[cite: 16]
    this.map.on('click', (e) => {
      if (e.target === this.map) this.resetSelezione();
    });

    setTimeout(() => this.map.invalidateSize(), 200);
  }

  private resetSelezione() {
    if (this.layerSelezionato) {
      (this.layerSelezionato as L.Path).setStyle({ color: '#ff4500', weight: 4, opacity: 0.8 });
      this.layerSelezionato = null;
    }
    this.sentieroService.sentieroSelezionato.set(null);
    this.map.closePopup();
  }

  private updateMap(sentieri: any[]): void {
    this.geoJsonLayer.clearLayers();

    sentieri.forEach(s => {
      // controllo se esistono geometrie valide[cite: 16]
      if (!s.geometry || !s.geometry.coordinates || s.geometry.coordinates.length === 0) {
        console.warn('Sentiero senza geometria valida:', s);
        return;
      }

      // Crea il tracciato
      const layer = L.geoJSON(s.geometry, {
        style: { color: '#ff4500', weight: 4, opacity: 0.8 }
      }).addTo(this.geoJsonLayer);

      const coords = s.geometry.coordinates;
      let startPoint: L.LatLngExpression;
      try {
        if (s.geometry.type === 'Point') {
          startPoint = [coords[1], coords[0]];
        } else if (s.geometry.type === 'LineString') {
          startPoint = [coords[0][1], coords[0][0]];
        } else {
          startPoint = [coords[0][0][1], coords[0][0][0]];
        }
        
        const marker = L.marker(startPoint).addTo(this.geoJsonLayer);
      
        const seleziona = (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e); // Impedisce al click di arrivare alla mappa[cite: 16]
          
          const giaSelezionato = this.sentieroService.sentieroSelezionato()?.osm_id === s.osm_id;
          
          // Se è già selezionato, lo deselezioniamo (Toggle)
          if (giaSelezionato) {
            this.resetSelezione();
            return;
          }
          
          // Reset stile del sentiero precedentemente selezionato
          if (this.layerSelezionato) {
            (this.layerSelezionato as L.Path).setStyle({ color: '#ff4500', weight: 4, opacity: 0.8 });
          }

          // Nuova selezione grafia[cite: 16]
          this.layerSelezionato = layer;
          (layer as any).setStyle({ color: '#007bff', weight: 8, opacity: 1 });
          (layer as any).bringToFront();

          // Aggiorna Signal nel servizio[cite: 11]
          this.sentieroService.sentieroSelezionato.set(s);
          
          // Calcolo nome da mostrare (Priorità al nome rispetto al numero)[cite: 13]
          const nomeMostrato = s.properties?.name || (s.properties?.ref ? 'Sentiero ' + s.properties.ref : 'Sentiero senza nome');

          L.popup()
            .setLatLng(e.latlng)
            .setContent(`<b>${nomeMostrato}</b>`)
            .openOn(this.map);
        };

        // Colleghiamo il click sia alla LINEA che al MARKER[cite: 16]
        layer.on('click', seleziona);
        marker.on('click', seleziona);
      } catch (error) {
        console.error('Errore nel creare marker per sentiero:', s, error);
      }
    });

    const bounds = this.geoJsonLayer.getBounds();
    if(bounds.isValid()) this.map.fitBounds(bounds, { padding: [30, 30] });
  }
}