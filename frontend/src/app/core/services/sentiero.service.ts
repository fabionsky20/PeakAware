import { Injectable, signal, inject } from '@angular/core';
import { SentieriService as ApiSentieriService, Sentiero } from '../../api'; // Usa quelli generati
import {AdminService as ApiAdminService} from '../../api'; // Per chiamate admin (toggle visibilità)
@Injectable({ providedIn: 'root' })
export class SentieroService {
  private apiService = inject(ApiSentieriService); // Il servizio generato
  private adminService = inject(ApiAdminService); // Il servizio admin

  sentieri = signal<Sentiero[]>([]);
  sentieroSelezionato = signal<Sentiero | null>(null);

  loadSentieri() {
    this.apiService.getAllSentieri().subscribe({
      next: (dati) => this.sentieri.set(dati),
      error: (err) => console.error('Errore nel caricamento:', err)
    });
  }

  // Esempio per la rotta protetta[cite: 5, 7]
  toggleVisibilita(id: string) {
    return this.adminService.toggleVisibilita(id);
  }
}