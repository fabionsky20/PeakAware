/**
 * @file sentiero.service.ts
 * @description Servizio Angular per la gestione dello stato dei sentieri.
 * Wrappa i servizi auto-generati dall'OpenAPI spec (ApiSentieriService, ApiAdminService)
 * esponendo segnali reattivi per la lista dei sentieri e il sentiero selezionato.
 * Il metodo toggleVisibilita è utilizzato dall'interfaccia admin sulla mappa.
 */

import { Injectable, signal, inject } from '@angular/core';
import { SentieriService as ApiSentieriService, Sentiero } from '../../api'; // Usa quelli generati
import {AdminService as ApiAdminService} from '../../api'; // Per chiamate admin (toggle visibilità)
@Injectable({ providedIn: 'root' })
export class SentieroService {
  private apiService = inject(ApiSentieriService); // Il servizio generato
  private adminService = inject(ApiAdminService); // Il servizio admin

  sentieri = signal<Sentiero[]>([]);
  sentieroSelezionato = signal<Sentiero | null>(null);

  /** Carica tutti i sentieri visibili dal backend e aggiorna il segnale sentieri. */
  loadSentieri() {
    this.apiService.getAllSentieri().subscribe({
      next: (dati) => this.sentieri.set(dati),
      error: (err) => console.error('Errore nel caricamento:', err)
    });
  }

  /**
   * Inverte lo stato di visibilità di un sentiero tramite l'API admin.
   * @param id - osm_id del sentiero da aggiornare
   */
  toggleVisibilita(id: string) {
    return this.adminService.toggleVisibilita(id);
  }
}