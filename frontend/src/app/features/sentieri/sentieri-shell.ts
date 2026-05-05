/**
 * @file sentieri-shell.ts
 * @description Componente per la rappresentazione della lista dei sentieri.
 * D2 dove?
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './components/map/map'; // Il tuo componente mappa
import { TrailList } from '@features/sentieri/components/trail-list/trail-list'; // Pannello logica/lista

@Component({
  selector: 'app-sentieri-shell',
  standalone: true,
  imports: [CommonModule, MapComponent, TrailList],
  template: `
    <div class="sentieri-container">
      <!-- Pannello laterale per lista e controlli admin -->
      <aside class="sidebar">
        <app-trail-list />
      </aside>

      <!-- Area principale per la mappa -->
      <main class="map-area">
        <app-map />
      </main>
    </div>
  `,
  styles: [`
    .sentieri-container {
      display: flex;
      height: 100vh; /* Tutta l'altezza dello schermo */
      width: 100vw;
      overflow: hidden;
    }
    .sidebar {
      width: 400px;
      height: 100%;
      background: #ffffff;
      box-shadow: 2px 0 5px rgba(0,0,0,0.1);
      z-index: 2;
      overflow-y: auto;
      padding: 1.5rem;
    }
    .map-area {
      flex: 1; /* Prende tutto lo spazio rimanente */
      height: 100%;
      background: #e5e5e5;
    }
  `]
})
export class SentieriShell {}