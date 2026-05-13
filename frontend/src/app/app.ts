/**
 * @file app.ts
 * @description Componente principale dell'applicazione PeakAware.
 * Definisce la struttura generale dell'app e include il router outlet per la navigazione.
 */
import { Component, signal } from '@angular/core';
import {CommonModule} from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MapComponent } from './features/sentieri/components/map/map';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
