import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Paragraph from '@editorjs/paragraph';
import ImageTool from '@editorjs/image';

@Component({
  selector: 'app-notizie-form',
  standalone: true,
  imports: [FormsModule, NgIf],
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
        contenuto: Object.create(null), // Inizializzato come oggetto vuoto per EditorJS
        categoria: 'generale',
        dataPubblicazione: new Date().toISOString().substring(0, 10) // formato YYYY-MM-DD
    };

    errore: string = '';
    successo: string = '';          
    caricamento: boolean = false;
    editor!: EditorJS;

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

        this.inizializzaEditor();

        // Controlla se siamo in modalità modifica        
        this.notiziaId = this.route.snapshot.paramMap.get('id');
        if (this.notiziaId) {
            this.isModifica = true;
            this.caricaNotizia();
        }
    }   

    inizializzaEditor(): void {

    this.editor = new EditorJS({

        holder: 'editorjs',

        tools: {

            header: Header,

            paragraph: Paragraph,

            image: {

                class: ImageTool,

                config: {

                    endpoints: {

                        byFile:
                        'http://localhost:3000/api/admin/upload'

                    }

                }

            }

        }

    });

}

    caricaNotizia(): void {
        this.caricamento = true;
        this.errore = '';
        const token = this.authService.getToken();
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        const url = `${this.apiUrl}/notizie/${this.notiziaId}`;
        this.http.get<any>(url, { headers }).subscribe({
            next: async (data) => {
                this.notizia = data.dati;
                // Converte la data ISO da MongoDB in formato YYYY-MM-DD per <input type="date">
                if (this.notizia.dataPubblicazione) {
                    this.notizia.dataPubblicazione = new Date(this.notizia.dataPubblicazione)
                        .toISOString()
                        .substring(0, 10);
                }
                await this.editor.isReady;
                await this.editor.render(this.notizia.contenuto);
                this.caricamento = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.errore = 'Errore durante il caricamento della notizia.';
                this.caricamento = false;
                this.cdr.detectChanges();
            }
        });
    }

    

    aggiungiNotizia(): void {
        this.notizia = {
            titolo: '',
            contenuto: '',
            dataPubblicazione: new Date().toISOString().substring(0, 10) // formato YYYY-MM-DD
        };
        this.router.navigate(['/admin/notizie-form']);
    }

    async salva(): Promise<void> {
        this.caricamento = true;
        this.errore = '';
        this.successo = '';
        this.notizia.contenuto =
        await this.editor.save();

        const token = this.authService.getToken();
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

        if (this.isModifica) {
            // Modifica notizia esistente
            this.http.put<any>(`${this.apiUrl}/notizie/${this.notiziaId}`, this.notizia, { headers }).subscribe({
                next: (data) => {
                    this.successo = 'Notizia modificata con successo!';
                    this.caricamento = false;
                    this.cdr.detectChanges();
                    setTimeout(() => this.router.navigate(['/cicerone/notizie']), 1200);
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
                    setTimeout(() => this.router.navigate(['/cicerone/notizie']), 1200);
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