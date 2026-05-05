/**
 * @file sentiero.service.ts
 * @description Servizio per la gestione dei sentieri.
 * D2 dove?
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SentieroService {
    constructor() {
        // Se vedi questo log 2 volte con numeri diversi, hai 2 istanze!
        console.log('Istanza SentieroService creata:', Math.random());
    }

    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/sentieri';

    private _sentieri = signal<any[]>([]);
    sentieri = this._sentieri.asReadonly();
    
    // Cambiato in any per contenere l'intero oggetto
    sentieroSelezionato = signal<any | null>(null);

    loadSentieri() {
        this.http.get<any>(this.apiUrl).subscribe({
        next: (risposta) => {
      // Estrazione sicura dell'array: cerca la proprietà 'sentieri' o usa la risposta stessa
      const dati = risposta && risposta.sentieri ? risposta.sentieri : risposta;
      const arrayPulito = Array.isArray(dati) ? dati : [];
      
      this._sentieri.set(arrayPulito);
      console.log('Service: Dati caricati', arrayPulito.length);
    },
    error: (err) => console.error('Errore caricamento:', err)
    });
    }
}