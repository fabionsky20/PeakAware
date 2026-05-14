import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';

interface Notizia {
  _id: string;
  titolo: string;
  contenuto: string;
  dataPubblicazione: string;
}

@Component({
  selector: 'app-notizie',
  standalone: true,
    imports: [FormsModule, CommonModule, DatePipe],
    templateUrl: './notizie.html',
    styleUrl: './notizie.css'
})
export class Notizie implements OnInit {
    notizie: Notizia[] = [];
    caricamento: boolean = false;
    errore: string = '';

    /** Ruolo dell'utente loggato — determina se mostrare i controlli admin */
    ruoloUtente: string = 'utente';
    
    private apiUrl = 'http://localhost:3000/api/cicerone';
    
    constructor(        
        private http: HttpClient,
        private authService: AuthService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.ruoloUtente = this.authService.getRuolo();
        this.caricaNotizie();
    }  

    caricaNotizie(): void {
        this.caricamento = true;
        this.errore = '';   
        let url = `${this.apiUrl}/notizie`;

        this.http.get<any>(url).subscribe({
            next: (data) => {
                this.notizie = data;
                this.caricamento = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.errore = 'Errore durante il caricamento delle notizie.';
                this.caricamento = false;
                this.cdr.detectChanges();
            }
        });
    }
    
    avviaNotizia(id: string): void {
        this.router.navigate(['/cicerone/notizie', id]);
    }

    nuovaNotizia(): void {
        this.router.navigate(['/cicerone/notizie-form']);
    }

    modificaNotizia(id: string, event: Event): void {
        event.stopPropagation();
        this.router.navigate(['/cicerone/notizie-form', id]);
    }

    eliminaNotizia(id: string, event: Event): void {    
        event.stopPropagation();
        if (confirm('Sei sicuro di voler eliminare questa notizia?')) {
            const url = `${this.apiUrl}/notizie/${id}`;
            this.http.delete(url).subscribe({
                next: () => {
                    this.notizie = this.notizie.filter(notizia => notizia._id !== id);
                    this.cdr.detectChanges();
                },
                error: () => {
                    alert('Errore durante l\'eliminazione della notizia.');
                }
            }); 
        }
    }
   
    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
