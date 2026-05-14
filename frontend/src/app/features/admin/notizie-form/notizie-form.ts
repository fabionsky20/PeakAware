import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-notizie-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './notizie-form.html',
  styleUrl: './notizie-form.css'
})

export class NotizieForm implements OnInit {

  /** true se stiamo modificando una notizia esistente, false se stiamo creando */
  isModifica: boolean = false;

    /** ID della notizia in modifica — preso dalla route */
    notiziaId: string | null = null;

    /** Oggetto notizia che viene popolato dal form */
    notizia: any = {
        titolo: '',
        contenuto: '',
        dataPubblicazione: new Date().toISOString().substring(0, 10) // formato YYYY-MM-DD
    };

    errore: string = '';
    successo: string = '';          
    caricamento: boolean = false;

    private apiUrl = 'http://localhost:3000/api/cicerone';
    constructor(
        private http: HttpClient,
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) {}            

    ngOnInit(): void {
        // Verifica autenticazione
        if (!this.authService.isAutenticato()) {
            this.router.navigate(['/login']);
            return;
        }   

        // Controlla se siamo in modalità modifica        
        this.notiziaId = this.route.snapshot.paramMap.get('id');
        if (this.notiziaId) {
            this.isModifica = true;
            this.caricaNotizia();
        }
    }   
    caricaNotizia(): void {
        this.caricamento = true;
        this.errore = '';   
        let url = `${this.apiUrl}/notizie/${this.notiziaId}`;
        this.http.get<any>(url).subscribe({
            next: (data) => {
                this.notizia = data;
                this.caricamento = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.errore = 'Errore durante il caricamento della notizia.';
                this.caricamento = false;
                this.cdr.detectChanges();
            }   
        });
    }

    salva(): void {
        this.caricamento = true;
        this.errore = '';
        this.successo = '';
        const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);

        if (this.isModifica) {
            // Modifica notizia esistente
            this.http.put<any>(`${this.apiUrl}/notizie/${this.notiziaId}`, this.notizia, { headers }).subscribe({
                next: (data) => {
                    this.successo = 'Notizia modificata con successo!';
                    this.caricamento = false;
                    this.cdr.detectChanges();
                    setTimeout(() => this.router.navigate(['/cicerone/notizie']), 2000);
                },
                error: (error) => {
                    this.errore = 'Errore durante la modifica della notizia.';                      
                    this.caricamento = false;
                    this.cdr.detectChanges();
                }
            });
        }   else {      // Crea nuova notizia       
                    this.http.post<any>(`${this.apiUrl}/notizie`, this.notizia, { headers }).subscribe({           
                    next: (data) => {
                    this.successo = 'Notizia creata con successo!';
                    this.caricamento = false;
                    this.cdr.detectChanges();
                    setTimeout(() => this.router.navigate(['/cicerone/notizie']), 2000);
                },
                error: (error) => {
                    this.errore = 'Errore durante la creazione della notizia.'; 
                    this.caricamento = false;
                    this.cdr.detectChanges();
                }  
            });
        }
    }
    annulla(): void {
        this.router.navigate(['/cicerone/notizie']);
    }
}