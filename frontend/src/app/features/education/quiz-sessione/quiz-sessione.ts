/**
 * @file quiz-sessione.ts
 * @description Componente QuizSessione — gestisce il flusso di una sessione quiz.
 * Mostra le domande una alla volta, gestisce il timer per domanda, registra
 * le risposte e mostra il feedback immediato dopo ogni risposta.
 * Supporta domande con una o più risposte corrette: l'utente può selezionare
 * più opzioni e la risposta è corretta solo se coincidono esattamente con le corrette.
 * Corrisponde al Modulo Educazione del D2 sezione 1.3.
 * Implementa US-06 (risposta domanda per domanda), US-07 (timer), US-08 (feedback immediato).
 */

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

interface Risposta {
  _id: string;
  testo: string;
}

interface Domanda {
  _id: string;
  testo: string;
  tipo: string;
  tempo: number;
  puntiChevale: number;
  numRisposteCorrette: number;
  risposte: Risposta[];
}

interface Feedback {
  corretta: boolean;
  puntiOttenuti: number;
  risposteCorrette: string[];
  tempoScaduto?: boolean;
}

@Component({
  selector: 'app-quiz-sessione',
  standalone: true,
  imports: [],
  templateUrl: './quiz-sessione.html',
  styleUrl: './quiz-sessione.css'
})
export class QuizSessione implements OnInit, OnDestroy {

  sessioneId: string = '';
  domande: Domanda[] = [];
  indiceDomanda: number = 0;
  risposteSelezionate: string[] = [];
  feedback: Feedback | null = null;

  tempoRimasto: number = 0;
  private timerInterval: any = null;

  caricamento: boolean = true;
  invioInCorso: boolean = false;
  errore: string = '';

  private apiUrl = 'http://localhost:3000/api/educazione';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const quizId = this.route.snapshot.paramMap.get('quizId');
    if (quizId) this.avvia(quizId);
  }

  ngOnDestroy(): void {
    this.fermaTimer();
  }

  get domandaCorrente(): Domanda | null {
    return this.domande[this.indiceDomanda] ?? null;
  }

  get isUltimaDomanda(): boolean {
    return this.indiceDomanda === this.domande.length - 1;
  }

  /**
   * Indica se la domanda corrente ammette più risposte corrette.
   *
   * @returns true se numRisposteCorrette > 1
   */
  get isMultiRisposta(): boolean {
    return (this.domandaCorrente?.numRisposteCorrette ?? 1) > 1;
  }

  /**
   * Testo della risposta/e corrette da mostrare nel feedback errore.
   *
   * @returns Stringa con le risposte corrette separate da virgola
   */
  get risposteCorretteTesto(): string {
    return this.feedback?.risposteCorrette?.join(', ') ?? '';
  }

  /**
   * Etichetta singolare/plurale per il feedback sulle risposte corrette.
   *
   * @returns 'Risposta corretta' o 'Risposte corrette'
   */
  get etichettaRispostaCorretta(): string {
    return (this.feedback?.risposteCorrette?.length ?? 0) > 1
      ? 'Risposte corrette'
      : 'Risposta corretta';
  }

  /**
   * Avvia la sessione quiz chiamando il backend.
   * Riceve le domande senza il campo eCorretta ma con numRisposteCorrette.
   *
   * @param quizId - ID del quiz da avviare
   */
  private avvia(quizId: string): void {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });

    this.http.post<any>(`${this.apiUrl}/sessione/avvia/${quizId}`, {}, { headers }).subscribe({
      next: (risposta) => {
        this.sessioneId = risposta.dati.sessioneId;
        this.domande = risposta.dati.domande;
        this.caricamento = false;
        this.cdr.detectChanges();
        this.avviaTimer();
      },
      error: () => {
        this.caricamento = false;
        this.errore = 'Errore nell\'avvio del quiz. Riprova.';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Aggiunge o rimuove una risposta dall'array di selezione (toggle).
   * Ignorato se il feedback è già visibile o se è in corso un invio.
   *
   * @param idRisposta - ID della risposta cliccata
   */
  selezionaRisposta(idRisposta: string): void {
    if (this.feedback || this.invioInCorso) return;
    const idx = this.risposteSelezionate.indexOf(idRisposta);
    if (idx === -1) {
      this.risposteSelezionate = [...this.risposteSelezionate, idRisposta];
    } else {
      this.risposteSelezionate = this.risposteSelezionate.filter((id) => id !== idRisposta);
    }
  }

  /**
   * Verifica se una risposta è attualmente selezionata.
   *
   * @param idRisposta - ID della risposta da verificare
   * @returns true se è nell'array di selezione
   */
  isSelezionata(idRisposta: string): boolean {
    return this.risposteSelezionate.includes(idRisposta);
  }

  /**
   * Invia le risposte selezionate al backend e mostra il feedback immediato.
   * Implementa US-08.
   */
  confermaRisposta(): void {
    if (this.risposteSelezionate.length === 0 || this.invioInCorso || !this.domandaCorrente) return;
    this.fermaTimer();
    this.invioInCorso = true;

    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    const body = {
      idDomanda: this.domandaCorrente._id,
      idRisposte: this.risposteSelezionate,
    };

    this.http.post<any>(`${this.apiUrl}/sessione/${this.sessioneId}/rispondi`, body, { headers }).subscribe({
      next: (risposta) => {
        this.invioInCorso = false;
        this.feedback = risposta.dati;
        this.cdr.detectChanges();
      },
      error: () => {
        this.invioInCorso = false;
        this.errore = 'Errore nel registrare la risposta.';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Avanza alla domanda successiva o termina il quiz se è l'ultima.
   */
  prossimaDomanda(): void {
    if (this.isUltimaDomanda) {
      this.termina();
      return;
    }
    this.indiceDomanda++;
    this.risposteSelezionate = [];
    this.feedback = null;
    this.avviaTimer();
  }

  /**
   * Chiude la sessione e naviga alla schermata del risultato.
   * Implementa US-09.
   */
  private termina(): void {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });

    this.http.post<any>(`${this.apiUrl}/sessione/${this.sessioneId}/termina`, {}, { headers }).subscribe({
      next: (risposta) => {
        this.router.navigate(['/educazione/risultato'], {
          state: { risultato: risposta.dati }
        });
      },
      error: () => {
        this.errore = 'Errore nella conclusione del quiz.';
      }
    });
  }

  /**
   * Avvia il conto alla rovescia per la domanda corrente.
   * Quando scade, mostra feedback di tempo scaduto senza inviare risposta.
   * Implementa US-07.
   */
  private avviaTimer(): void {
    this.fermaTimer();
    const tempo = this.domandaCorrente?.tempo ?? 0;
    if (tempo <= 0) return;

    this.tempoRimasto = tempo;
    this.timerInterval = setInterval(() => {
      this.tempoRimasto--;
      if (this.tempoRimasto <= 0) {
        this.fermaTimer();
        this.feedback = { corretta: false, puntiOttenuti: 0, risposteCorrette: [], tempoScaduto: true };
      }
    }, 1000);
  }

  private fermaTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
