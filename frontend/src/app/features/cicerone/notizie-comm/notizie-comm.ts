/**
 * @file notizie-comm.ts
 * @description Componente colonna commenti nella pagina dettaglio notizia.
 * Carica, aggiunge ed elimina commenti per la notizia identificata da :id
 * nella rotta. L'eliminazione è disponibile all'autore del commento e agli admin.
 */
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';


interface Commento {
    _id: string;
    autore: { _id: string; username: string };
    testo: string;
    dataCreazione: string;
}

@Component({
    selector: 'app-notizie-comm',
    standalone: true,
    imports: [FormsModule, CommonModule, DatePipe],
    templateUrl: './notizie-comm.html',
    styleUrl: './notizie-comm.css'
})
export class NotizieComm implements OnInit {
    commenti: Commento[] = [];
    nuovoCommento: string = '';
    caricamento: boolean = false
    errore: string = '';
    id: string | null = null;
    idUtenteLoggato: string = '';
    ruoloUtente: string = '';

    private apiUrl = 'http://localhost:3000/api/cicerone';

    constructor(
        private http: HttpClient,
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.idUtenteLoggato = this.authService.utente()?.id ?? '';
        this.ruoloUtente = this.authService.getRuolo();
        this.id = this.route.snapshot.paramMap.get('id');
        if (this.id) this.caricaCommenti(this.id);
    }

    caricaCommenti(notiziaId: string): void {
        this.caricamento = true;
        this.errore = '';
        const token = this.authService.getToken();
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        this.http.get<Commento[]>(`${this.apiUrl}/notizie/${notiziaId}/commenti`, { headers }).subscribe({
            next: (data) => {
                this.commenti = data;
                this.caricamento = false;
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.errore = 'Errore nel caricamento dei commenti.';
                this.caricamento = false;
            }
        });
    }

    aggiungiCommento(): void {
        if (!this.nuovoCommento.trim() || !this.id) {
            return;
        }
        const token = this.authService.getToken();
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        this.http.post(`${this.apiUrl}/notizie/${this.id}/commenti`, { testo: this.nuovoCommento }, { headers }).subscribe({
            next: () => {
                this.nuovoCommento = '';
                if (this.id) {
                    this.caricaCommenti(this.id);
                }
            },
            error: () => {
                this.errore = 'Errore nell\'aggiunta del commento.';
            }
        });
    }

    eliminaCommento(commentoId: string): void {
        if (!this.id) {
            return;
        }   
        const token = this.authService.getToken();
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        this.http.delete(`${this.apiUrl}/notizie/${this.id}/commenti/${commentoId}`, { headers }).subscribe({
            next: () => {
                if (this.id) {
                    this.caricaCommenti(this.id);
                }
            },
            error: () => {
                this.errore = 'Errore nell\'eliminazione del commento.';
            }
        });
    }

    tornaIndietro(): void {
        this.router.navigate(['/cicerone/notizie']);
    }
};



