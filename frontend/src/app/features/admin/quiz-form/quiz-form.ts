/**
 * @file quiz-form.ts
 * @description Componente form per creazione e modifica quiz.
 * Accessibile solo agli utenti admin/SAT.
 * Corrisponde al componente Gestione Contenuti del D2 sezione 1.3.
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-quiz-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './quiz-form.html',
  styleUrl: './quiz-form.css'
})
export class QuizForm implements OnInit {

  /** true se stiamo modificando un quiz esistente, false se stiamo creando */
  isModifica: boolean = false;

  /** ID del quiz in modifica — preso dalla route */
  quizId: string | null = null;

  /** Oggetto quiz che viene popolato dal form */
  quiz: any = {
    titolo: '',
    argomento: '',
    categoria: 'generale',
    difficolta: 1,
    punteggio: 100,
    tempo: 0,
    videoCollegato: '',
    domande: []
  };

  /** Lista dei video disponibili per il collegamento */
  videoDisponibili: { _id: string; titolo: string }[] = [];

  errore: string = '';
  successo: string = '';
  caricamento: boolean = false;

  private apiUrl = 'http://localhost:3000/api/educazione';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAutenticato()) {
      this.router.navigate(['/login']);
      return;
    }

    this.caricaVideo();

    this.quizId = this.route.snapshot.paramMap.get('id');
    if (this.quizId) {
      this.isModifica = true;
      this.caricaQuiz();
    }
  }

  /** Carica la lista video per il select di collegamento. */
  caricaVideo(): void {
    this.http.get<any>(`${this.apiUrl}/video`).subscribe({
      next: (risposta) => {
        this.videoDisponibili = (risposta.dati || []).map((v: any) => ({
          _id: v._id,
          titolo: v.titolo,
        }));
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  /**
   * Carica i dati del quiz da modificare.
   */
  caricaQuiz(): void {
    this.http.get<any>(`${this.apiUrl}/quiz/${this.quizId}`).subscribe({
      next: (risposta) => {
        if (risposta.successo) {
          const dati = risposta.dati;
          // Normalizza videoCollegato: se è un oggetto popolato prende solo l'_id
          dati.videoCollegato = dati.videoCollegato?._id ?? dati.videoCollegato ?? '';
          this.quiz = dati;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.errore = 'Errore nel caricamento del quiz';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Aggiunge una nuova domanda vuota al quiz.
   */
  aggiungiDomanda(): void {
    this.quiz.domande.push({
      testo: '',
      tipo: 'multipla',
      puntiChevale: 10,
      tentativi: 1,
      risposte: [
        { testo: '', eCorretta: false },
        { testo: '', eCorretta: false }
      ]
    });
  }

  /**
   * Rimuove una domanda dalla lista.
   *
   * @param index - Indice della domanda da rimuovere
   */
  rimuoviDomanda(index: number): void {
    this.quiz.domande.splice(index, 1);
  }

  /**
   * Aggiunge una risposta vuota a una domanda.
   *
   * @param domandaIndex - Indice della domanda
   */
  aggiungiRisposta(domandaIndex: number): void {
    this.quiz.domande[domandaIndex].risposte.push({
      testo: '',
      eCorretta: false
    });
  }

  /**
   * Rimuove una risposta da una domanda.
   *
   * @param domandaIndex - Indice della domanda
   * @param rispostaIndex - Indice della risposta da rimuovere
   */
  rimuoviRisposta(domandaIndex: number, rispostaIndex: number): void {
    this.quiz.domande[domandaIndex].risposte.splice(rispostaIndex, 1);
  }

  /**
   * Salva il quiz — crea o aggiorna in base a isModifica.
   */
  salva(): void {
    this.errore = '';
    this.successo = '';
    this.caricamento = true;

    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const dati = {
      ...this.quiz,
      videoCollegato: this.quiz.videoCollegato || null,
      // Auto-assegna posizione per le domande di tipo riordinamento
      domande: this.quiz.domande.map((d: any) => {
        if (d.tipo !== 'riordinamento') return d;
        return {
          ...d,
          risposte: d.risposte.map((r: any, i: number) => ({ ...r, posizione: i + 1 })),
        };
      }),
    };

    const richiesta = this.isModifica
      ? this.http.put<any>(`${this.apiUrl}/quiz/${this.quizId}`, dati, { headers })
      : this.http.post<any>(`${this.apiUrl}/quiz`, dati, { headers });

    richiesta.subscribe({
      next: (risposta) => {
        this.caricamento = false;
        if (risposta.successo) {
          this.successo = this.isModifica
            ? 'Quiz aggiornato con successo!'
            : 'Quiz creato con successo!';
          setTimeout(() => this.router.navigate(['/educazione/quiz']), 1200);
        }
      },
      error: (err) => {
        this.caricamento = false;
        this.errore = err.error?.messaggio || 'Errore nel salvataggio del quiz';
      }
    });
  }

  /**
   * Torna alla lista quiz senza salvare.
   */
  annulla(): void {
    this.router.navigate(['/educazione/quiz']);
  }
}