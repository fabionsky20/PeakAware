/**
 * @file sentieri-shell.ts
 * @description Shell che compone mappa + sidebar sincronizzata.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './components/map/map';
import { SidebarComponent } from '@features/sentieri/components/trail-list/sidebar';

@Component({
  selector: 'app-sentieri-shell',
  standalone: true,
  imports: [CommonModule, MapComponent, SidebarComponent],
  template: `
    <div class="sentieri-container">
      <aside class="sidebar">
        <app-sidebar />
      </aside>
      <main class="map-area">
        <app-map />
      </main>
    </div>
  `,
  styles: [`
    .sentieri-container {
      display: flex;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }
    .sidebar {
      width: 400px;
      height: 100%;
      background: #ffffff;
      box-shadow: 2px 0 5px rgba(0,0,0,0.1);
      z-index: 2;
      overflow: hidden; /* lo scroll lo gestisce SidebarComponent */
    }
    .map-area {
      flex: 1;
      height: 100%;
    }
  `]
})
export class SentieriShell {}