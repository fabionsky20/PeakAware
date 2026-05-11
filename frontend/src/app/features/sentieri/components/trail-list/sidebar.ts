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

  /** Lista con il selezionato sempre in testa (per ordinamento visivo opzionale) */
  sentieriOrdinati = computed(() => {
    return [...this.sentieroService.sentieri()];
  });

  seleziona(sentiero: any) {
    const corrente = this.sentieroService.sentieroSelezionato();
    if (corrente?.osm_id === sentiero.osm_id) {
      this.sentieroService.sentieroSelezionato.set(null);
    } else {
      this.sentieroService.sentieroSelezionato.set(sentiero);
    }
  }

  constructor() {
    // Ogni volta che cambia la selezione, scrolla la sidebar sulla card giusta
    effect(() => {
      const selezionato = this.sentieroService.sentieroSelezionato();
      if (!selezionato) return;

      // Aspetta il prossimo ciclo di rendering perché la card potrebbe
      // non essere ancora nel DOM (caso: selezione arriva dalla mappa)
      setTimeout(() => {
        const lista = this.sentieriOrdinati();
        const idx = lista.findIndex(s => s.osm_id === selezionato.osm_id);
        const cards = this.trailCards?.toArray();
        if (idx > -1 && cards?.[idx]) {
          cards[idx].nativeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }, 50);
    });
  }
}