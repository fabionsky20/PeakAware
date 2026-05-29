import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';

interface Notizia {
  _id: string;
  titolo: string;
  contenuto: { blocks: { type: string; data: any }[] };
  categoria: string;  
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
    categoriaSelezionata: string = '';
    errore: string = '';
    id: string | null = null;

    /** Ruolo dell'utente loggato — determina se mostrare i controlli admin */
    ruoloUtente: string = 'utente';
    
    private apiUrl = 'http://localhost:3000/api/cicerone';
    
    constructor(        
        private http: HttpClient,
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.ruoloUtente = this.authService.getRuolo();
        this.caricaNotizie();
        this.id = this.route.snapshot.paramMap.get('id');
    }  

    caricaNotizie(): void {

        this.caricamento = true;
        this.errore = '';

        const token = this.authService.getToken();
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}`});

        // URL corretto
        let url = `${this.apiUrl}/notizie`;

        if (this.categoriaSelezionata) {
            url += `?categoria=${this.categoriaSelezionata}`;
        }

        // Chiamata HTTP con token
        this.http.get<any>(url, { headers }).subscribe({

            next: (data) => {
                this.notizie = data.dati;
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
        this.router.navigate(['/cicerone/notizia', id]);
    }

    nuovaNotizia(): void {
        this.router.navigate(['/admin/notizie-form']);
    }

    modificaNotizia(id: string, event: Event): void {
        event.stopPropagation();
        this.router.navigate(['/admin/notizie-form', id]);
    }

    eliminaNotizia(id: string, event: Event): void {
        event.stopPropagation();
        if (confirm('Sei sicuro di voler eliminare questa notizia?')) {
            const url = `${this.apiUrl}/notizie/${id}`;
            const token = this.authService.getToken();
            const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
            this.http.delete(url, { headers }).subscribe({
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

    annulla(): void {
        this.router.navigate(['home']);
    }
   
    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    /** Restituisce l'URL della prima immagine trovata nei blocchi EditorJS */
  getPrimaImmagine(notizia: Notizia): string | null {
    const blocks = notizia.contenuto?.blocks ?? [];
    const imgBlock = blocks.find(b => b.type === 'image');
    return imgBlock?.data?.file?.url ?? null;
  }
 
  /** Restituisce il testo del primo blocco paragraph (max 150 caratteri) */
  getPrimaDescrizione(notizia: Notizia): string {
    const blocks = notizia.contenuto?.blocks ?? [];
    const paraBlock = blocks.find(b => b.type === 'paragraph');
    if (!paraBlock) return '';
    // rimuove eventuali tag HTML inline di EditorJS
    const testo = paraBlock.data.text.replace(/<[^>]*>/g, '');
    return testo.length > 150 ? testo.substring(0, 150) + '…' : testo;
  }
}
