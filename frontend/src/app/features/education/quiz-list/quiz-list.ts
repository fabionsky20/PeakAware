/**
 * @file quiz-list.ts
 * @description Componente QuizList di PeakAware.
 * Recupera e mostra la lista dei quiz dal backend.
 * Se l'utente è admin mostra i controlli di gestione.
 * Corrisponde al Modulo Educazione del D2 sezione 1.3.
 * D4: aggiunta etichetta difficoltà testuale (US-05) e marcatura quiz completati (US-16).
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileButton } from '../../sentieri/components/profile-button/profile-button';

interface Quiz {
  _id: string;
  titolo: string;
  argomento: string;
  categoria: string;
  difficolta: number;
  punteggio: number;
  tempo: number;
  numeroDomande?: number;
  videoCollegato?: { _id: string; titolo: string; url: string } | null;
}

interface BadgeSidebar {
  _id: string;
  nome: string;
  icona: string;
  descrizione: string;
  percentuale: number;
  ottenuto: boolean;
}

@Component({
  selector: 'app-quiz-list',
  standalone: true,
  imports: [FormsModule, ProfileButton],
  templateUrl: './quiz-list.html',
  styleUrl: './quiz-list.css'
})
export class QuizList implements OnInit {
  
  quiz: Quiz[] = [];
  badges: BadgeSidebar[] = [];
  categoriaSelezionata: string = '';
  caricamento: boolean = false;
  errore: string = '';

  /** Ruolo dell'utente loggato — determina se mostrare i controlli admin */
  ruoloUtente: string = 'utente';

  puntiUtente: number = 0;
  livelloUtente: number = 1;

  /** IDs dei quiz già completati dall'utente — usato per US-16 */
  quizCompletatiIds: Set<string> = new Set();

  private apiUrl = 'http://localhost:3000/api/educazione';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Inizializza il componente: legge il ruolo dall'utente autenticato,
   * poi carica quiz e progressi in parallelo.
   */
  ngOnInit(): void {
    this.ruoloUtente = this.authService.getRuolo();
    this.caricaQuiz();
    this.caricaProgressi();
    this.caricaBadge();
  }

  /** Torna alla dashboard principale. */
  vaiAllaHomepage(): void {
    this.router.navigate(['/home']);
  }

  /** Naviga alla lista video. */
  vaiAiVideo(): void {
    this.router.navigate(['/educazione/video']);
  }

  /** Naviga alla pagina badge (gestione admin). */
  vaiBadge(): void {
    this.router.navigate(['/educazione/badge']);
  }

  /** Carica i badge con la percentuale di avanzamento dell'utente. */
  caricaBadge(): void {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    this.http.get<any>(`${this.apiUrl}/badge`, { headers }).subscribe({
      next: (risposta) => {
        this.badges = risposta.dati || [];
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  get badgeOttenuti(): number {
    return this.badges.filter(b => b.ottenuto).length;
  }

  /** Apre il video collegato al quiz in una nuova tab. */
  apriVideoCollegato(url: string, event: Event): void {
    event.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Recupera la lista di quiz dal backend applicando il filtro categoria corrente.
   * Aggiorna il template tramite ChangeDetectorRef perché il componente è OnPush-compatible.
   */
  caricaQuiz(): void {
    this.caricamento = true;
    this.errore = '';

    let url = `${this.apiUrl}/quiz`;
    if (this.categoriaSelezionata) {
      url += `?categoria=${this.categoriaSelezionata}`;
    }

    this.http.get<any>(url).subscribe({
      next: (risposta) => {
        this.quiz = risposta.dati || [];
        this.caricamento = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.caricamento = false;
        this.errore = 'Errore nel caricamento dei quiz';
        this.cdr.detectChanges();
      }
    });
  }

  /** Richiama caricaQuiz con il filtro categoria aggiornato dal select. */
  filtra(): void {
    this.caricaQuiz();
  }

  /**
   * Recupera punti e livello dell'utente autenticato dall'endpoint progressi.
   * Un errore qui non è bloccante: i dati rimangono ai valori di default.
   */
  caricaProgressi(): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(`${this.apiUrl}/progressi`, { headers }).subscribe({
      next: (risposta) => {
        if (risposta.successo) {
          this.puntiUtente = risposta.dati.punti;
          this.livelloUtente = risposta.dati.livello;
          // US-16: costruisce il Set degli ID quiz completati per il lookup O(1) nel template
          const completati: { idQuiz: string }[] = risposta.dati.quizCompletati || [];
          this.quizCompletatiIds = new Set(completati.map(q => q.idQuiz));
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  /** Avvia la sessione quiz navigando al componente sessione */
  avviaQuiz(id: string): void {
    this.router.navigate(['/educazione/sessione', id]);
  }

  /** Naviga al form di creazione nuovo quiz */
  nuovoQuiz(): void {
    this.router.navigate(['/admin/quiz-form']);
  }

  /** Naviga al form di modifica quiz */
  modificaQuiz(id: string, event: Event): void {
    event.stopPropagation(); // evita che il click si propaghi alla card
    this.router.navigate(['/admin/quiz-form', id]);
  }

  /** Elimina un quiz dopo conferma */
  eliminaQuiz(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Sei sicuro di voler eliminare questo quiz?')) return;

    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.delete<any>(`${this.apiUrl}/quiz/${id}`, { headers }).subscribe({
      next: () => this.caricaQuiz(),
      error: () => alert('Errore nella eliminazione del quiz')
    });
  }

  /**
   * Genera un array di lunghezza pari alla difficoltà, usato nel template
   * per renderizzare le stelle con @for.
   *
   * @param difficolta - Valore da 1 a 5
   * @returns Array vuoto di lunghezza difficolta
   */
  getStelle(difficolta: number): number[] {
    return Array(difficolta).fill(0);
  }

  /**
   * US-05: Restituisce l'etichetta testuale della difficoltà.
   * @param d - Valore da 1 a 5
   */
  getDifficoltaLabel(d: number): string {
    const labels: Record<number, string> = {
      1: 'Molto facile',
      2: 'Facile',
      3: 'Medio',
      4: 'Difficile',
      5: 'Molto difficile',
    };
    return labels[d] ?? '';
  }

  /** US-16: Restituisce true se l'utente ha già completato il quiz. */
  eCompletato(id: string): boolean {
    return this.quizCompletatiIds.has(id);
  }

  /** Termina la sessione e reindirizza al login. */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}