// trail-list.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentieroService } from '@core/services/sentiero.service';

@Component({
  selector: 'app-trail-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lista-container">
      <h2>Sentieri Disponibili</h2>
      <p class="stats">Trovati: {{ sentieroService.sentieri().length }}</p>

      <div class="scroll-area">
        @for (sentiero of sentieroService.sentieri(); track sentiero.osm_id) {
          
          <div class="card-sentiero" 
               [class.selezionato]="sentieroService.sentieroSelezionato()?.osm_id === sentiero.osm_id"
               (click)="seleziona(sentiero)">
            
            <!-- Usiamo ?. per evitare crash se properties manca -->
            <h3>{{ sentiero.properties?.name || 'Sentiero ' + (sentiero.properties?.ref || 'Senza Nome') }}</h3>
            <p><strong>Rif:</strong> {{ sentiero.properties?.ref || 'N/D' }}</p>
            
            <button class="btn-admin" 
                [class.disattivo]="!sentiero.isVisible"
                (click)="toggleVisibilita(sentiero.osm_id, $event)">
              {{ sentiero.isVisible ? 'Disattiva (Admin)' : 'Attiva (Admin)' }}
            </button>
          </div>

        } @empty {
          <p>Nessun sentiero caricato.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .lista-container { display: flex; flex-direction: column; height: 100%; }
    .scroll-area { flex: 1; overflow-y: auto; padding-right: 5px; }
    .card-sentiero {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      background: #fafafa;
      cursor: pointer;
      transition: all 0.2s;
    }
    /* Stile per la card selezionata */
    .card-sentiero.selezionato {
      border-left: 5px solid #007bff;
      background-color: #e3f2fd;
      transform: translateX(5px);
    }
    .btn-admin { margin-top: 10px; cursor: pointer; }
    .btn-admin { background-color: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; }
    .btn-admin.disattivo { background-color: #28a03c; }
  `]
})
export class TrailList {
  protected sentieroService = inject(SentieroService);

  seleziona(sentiero: any) {
    const corrente = this.sentieroService.sentieroSelezionato();
    
    // Se clicco lo stesso sentiero, lo deseleziono (null)
    if (corrente?.osm_id === sentiero.osm_id) {
      this.sentieroService.sentieroSelezionato.set(null);
      console.log('Deselezionato:', sentiero.osm_id);
    } else {
      // Altrimenti seleziono quello nuovo
      this.sentieroService.sentieroSelezionato.set(sentiero);
      console.log('Selezionato:', sentiero.osm_id);
    }
  }

  toggleVisibilita(osm_id: string, event: Event) {
    event.stopPropagation();
    // Logica toggle visibilità esistente
  }
}