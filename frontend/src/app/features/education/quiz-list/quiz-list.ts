/**
 * @file quiz-list.ts
 * @description Componente QuizList di PeakAware.
 * Recupera e mostra la lista dei quiz dal backend.
 * Se l'utente è admin mostra i controlli di gestione.
 * Corrisponde al Modulo Educazione del D2 sezione 1.3.
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

interface Quiz {
  _id: string;
  titolo: string;
  argomento: string;
  categoria: string;
  difficolta: number;
  punteggio: number;
  tempo: number;
}

@Component({
  selector: 'app-quiz-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './quiz-list.html',
  styleUrl: './quiz-list.css'
})
export class QuizList implements OnInit {

  quiz: Quiz[] = [];
  categoriaSelezionata: string = '';
  caricamento: boolean = false;
  errore: string = '';

  /** Ruolo dell'utente loggato — determina se mostrare i controlli admin */
  ruoloUtente: string = 'utente';

  puntiUtente: number = 0;
  livelloUtente: number = 1;

  private apiUrl = 'http://localhost:3000/api/educazione';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.ruoloUtente = this.authService.getRuolo();
    this.caricaQuiz();
    this.caricaProgressi();
  }

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

  filtra(): void {
    this.caricaQuiz();
  }

  caricaProgressi(): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(`${this.apiUrl}/progressi`, { headers }).subscribe({
      next: (risposta) => {
        if (risposta.successo) {
          this.puntiUtente = risposta.dati.punti;
          this.livelloUtente = risposta.dati.livello;
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

  getStelle(difficolta: number): number[] {
    return Array(difficolta).fill(0);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}