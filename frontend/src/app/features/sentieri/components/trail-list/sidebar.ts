import {
  Component, inject, ElementRef, computed,
  ViewChild, ViewChildren, QueryList, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentieroService } from '@core/services/sentiero.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  protected sentieroService = inject(SentieroService);

  @ViewChild('sidebarScroll') sidebarScroll!: ElementRef<HTMLElement>;
  @ViewChildren('trailCard') trailCards!: QueryList<ElementRef<HTMLElement>>;

  sentieriOrdinati = computed(() => [...this.sentieroService.sentieri()]);

  seleziona(sentiero: any) {
    const corrente = this.sentieroService.sentieroSelezionato();
    if (corrente?.osm_id === sentiero.osm_id) {
      this.sentieroService.sentieroSelezionato.set(null);
    } else {
      this.sentieroService.sentieroSelezionato.set(sentiero);
    }
  }

  /**
   * Converte ore decimali (es. 3.75) in formato leggibile "3h 45min".
   * Gestisce anche stringhe OSM tipo "03:45".
   */
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

  /**
   * Mappa la scala CAI al livello per il badge colorato via CSS.
   * T → easy, E → medium, EE → hard, EEA → expert
   */
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
      const selezionato = this.sentieroService.sentieroSelezionato();
      if (!selezionato) return;
      setTimeout(() => {
        const lista = this.sentieriOrdinati();
        const idx = lista.findIndex(s => s.osm_id === selezionato.osm_id);
        const cards = this.trailCards?.toArray();
        if (idx > -1 && cards?.[idx]) {
          cards[idx].nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    });
  }
}