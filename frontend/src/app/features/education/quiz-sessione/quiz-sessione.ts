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
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '@env';

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
  opzioniDestra?: string[];
  immagineUrl?: string;
  margine?: number;
}

interface DettaglioCollegamento {
  sinistra: string;
  destra: string;
  corretto: boolean;
  coppiaCorretta: string;
}

interface DettaglioIndovina {
  indice: number;
  corretto: boolean;
  parolaCorretta: string;
}

interface Feedback {
  corretta: boolean;
  puntiOttenuti: number;
  risposteCorrette: string[];
  tempoScaduto?: boolean;
  dettaglio?: DettaglioCollegamento[];
  puntoCorretto?: { x: number; y: number };
  margine?: number;
  distanza?: number;
  dettaglioIndovina?: DettaglioIndovina[];
}

@Component({
  selector: 'app-quiz-sessione',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './quiz-sessione.html',
  styleUrl: './quiz-sessione.css'
})
export class QuizSessione implements OnInit, OnDestroy {

  sessioneId: string = '';
  domande: Domanda[] = [];
  indiceDomanda: number = 0;
  risposteSelezionate: string[] = [];
  feedback: Feedback | null = null;

  // Riordinamento: lista corrente nell'ordine scelto dall'utente
  ordineRiordinamento: { _id: string; testo: string }[] = [];
  dragItemIndice: number = -1;
  dragOverIndice: number = -1;

  // Collegamento: coppie formate dall'utente e item sinistro attualmente selezionato
  coppieSelezionate: { sinistroId: string; sinistroTesto: string; destroTesto: string; colore: string }[] = [];
  sinistroSelezionato: string | null = null;

  // PuntaImmagine: coordinate cliccate dall'utente (in %)
  puntoSelezionato: { x: number; y: number } | null = null;

  // IndovinaParola: parole digitate dall'utente (una per risposta, nell'ordine)
  paroleDiGitate: string[] = [];
  private readonly COLORI_COLLEGAMENTO = ['#2E86C1', '#1E8449', '#D35400', '#7D3C98', '#C0392B', '#117A65'];

  tempoRimasto: number = 0;
  private timerInterval: any = null;

  // Timer globale del quiz (quiz.tempo)
  quizTempoTotale: number = 0;
  quizTempoRimasto: number = 0;
  tempoQuizScaduto: boolean = false;
  private quizTimerInterval: any = null;

  caricamento: boolean = true;
  invioInCorso: boolean = false;
  errore: string = '';

  private apiUrl = environment.apiUrl + '/api/educazione';

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
    this.fermaTimerQuiz();
  }

  vaiA(path: string): void {
    this.router.navigate([path]);
  }

  esci(): void {
    this.fermaTimer();
    this.fermaTimerQuiz();
    if (!this.sessioneId) {
      this.router.navigate(['/educazione/quiz']);
      return;
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    this.http.post<any>(`${this.apiUrl}/sessione/${this.sessioneId}/termina`, {}, { headers }).subscribe({
      next: (risposta) => {
        this.router.navigate(['/educazione/risultato'], {
          state: { risultato: risposta.dati, domande: this.domande }
        });
      },
      error: () => {
        this.router.navigate(['/educazione/quiz']);
      }
    });
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

  get isRiordinamento(): boolean {
    return this.domandaCorrente?.tipo === 'riordinamento';
  }

  get isCollegamento(): boolean {
    return this.domandaCorrente?.tipo === 'collegamento';
  }

  get isPuntaImmagine(): boolean {
    return this.domandaCorrente?.tipo === 'puntaImmagine';
  }

  get isIndovinaParola(): boolean {
    return this.domandaCorrente?.tipo === 'indovinaParola';
  }

  get isNormale(): boolean {
    return !this.isRiordinamento && !this.isCollegamento && !this.isPuntaImmagine && !this.isIndovinaParola;
  }

  get tutteParoleDigitate(): boolean {
    if (!this.isIndovinaParola) return false;
    return this.paroleDiGitate.length > 0 && this.paroleDiGitate.every(p => p.trim().length > 0);
  }

  get tutteAccoppiate(): boolean {
    return !!this.domandaCorrente?.risposte?.length &&
      this.coppieSelezionate.length === this.domandaCorrente.risposte.length;
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
        this.inizializzaRiordinamento();
        this.inizializzaCollegamento();
        this.inizializzaIndovinaParola();
        this.cdr.detectChanges();
        this.avviaTimer();
        const tempoQuiz = risposta.dati.quiz?.tempo ?? 0;
        if (tempoQuiz > 0) this.avviaTimerQuiz(tempoQuiz);
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
    if (!this.isMultiRisposta) {
      // Singola risposta: comportamento radio (sostituisce la selezione)
      this.risposteSelezionate = this.risposteSelezionate[0] === idRisposta ? [] : [idRisposta];
    } else {
      const idx = this.risposteSelezionate.indexOf(idRisposta);
      if (idx === -1) {
        this.risposteSelezionate = [...this.risposteSelezionate, idRisposta];
      } else {
        this.risposteSelezionate = this.risposteSelezionate.filter((id) => id !== idRisposta);
      }
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
    if (this.invioInCorso || !this.domandaCorrente) return;
    if (this.isNormale && this.risposteSelezionate.length === 0) return;
    if (this.isCollegamento && !this.tutteAccoppiate) return;
    if (this.isPuntaImmagine && !this.puntoSelezionato) return;
    if (this.isIndovinaParola && !this.tutteParoleDigitate) return;
    this.fermaTimer();
    this.invioInCorso = true;

    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    let body: any;
    if (this.isRiordinamento) {
      body = { idDomanda: this.domandaCorrente._id, ordine: this.ordineRiordinamento.map((r) => r._id) };
    } else if (this.isCollegamento) {
      body = {
        idDomanda: this.domandaCorrente._id,
        coppie: this.coppieSelezionate.map((c) => ({ sinistra: c.sinistroId, destra: c.destroTesto })),
      };
    } else if (this.isPuntaImmagine) {
      body = { idDomanda: this.domandaCorrente._id, punto: this.puntoSelezionato };
    } else if (this.isIndovinaParola) {
      body = { idDomanda: this.domandaCorrente._id, paroleDiGitate: this.paroleDiGitate };
    } else {
      body = { idDomanda: this.domandaCorrente._id, idRisposte: this.risposteSelezionate };
    }

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
    this.puntoSelezionato = null;
    this.inizializzaRiordinamento();
    this.inizializzaCollegamento();
    this.inizializzaIndovinaParola();
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
        // US-10: passa le domande (con testi risposte) per il riepilogo nella schermata risultato
        this.router.navigate(['/educazione/risultato'], {
          state: { risultato: risposta.dati, domande: this.domande }
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

  private avviaTimerQuiz(secondi: number): void {
    this.quizTempoTotale = secondi;
    this.quizTempoRimasto = secondi;
    this.quizTimerInterval = setInterval(() => {
      this.quizTempoRimasto--;
      this.cdr.detectChanges();
      if (this.quizTempoRimasto <= 0) {
        this.fermaTimerQuiz();
        this.fermaTimer();
        this.tempoQuizScaduto = true;
        this.cdr.detectChanges();
        this.terminaPerTempoScaduto();
      }
    }, 1000);
  }

  private fermaTimerQuiz(): void {
    if (this.quizTimerInterval) {
      clearInterval(this.quizTimerInterval);
      this.quizTimerInterval = null;
    }
  }

  private terminaPerTempoScaduto(): void {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    this.http.post<any>(`${this.apiUrl}/sessione/${this.sessioneId}/termina`, {}, { headers }).subscribe({
      next: (risposta) => {
        this.router.navigate(['/educazione/risultato'], {
          state: { risultato: { ...risposta.dati, tempoScaduto: true }, domande: this.domande }
        });
      },
      error: () => {
        this.router.navigate(['/educazione/quiz']);
      }
    });
  }

  get quizTempoFormattato(): string {
    const m = Math.floor(this.quizTempoRimasto / 60);
    const s = this.quizTempoRimasto % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Riordinamento ──────────────────────────────────────────

  private inizializzaRiordinamento(): void {
    if (this.domandaCorrente?.tipo === 'riordinamento') {
      this.ordineRiordinamento = [...(this.domandaCorrente.risposte ?? [])];
    }
  }

  onDragStart(indice: number): void {
    this.dragItemIndice = indice;
  }

  onDragOver(indice: number, event: DragEvent): void {
    event.preventDefault();
    this.dragOverIndice = indice;
  }

  onDragLeave(): void {
    this.dragOverIndice = -1;
  }

  onDrop(targetIndice: number, event: DragEvent): void {
    event.preventDefault();
    if (this.dragItemIndice === -1 || this.dragItemIndice === targetIndice) {
      this.dragItemIndice = -1;
      this.dragOverIndice = -1;
      return;
    }
    const items = [...this.ordineRiordinamento];
    const [dragged] = items.splice(this.dragItemIndice, 1);
    items.splice(targetIndice, 0, dragged);
    this.ordineRiordinamento = items;
    this.dragItemIndice = -1;
    this.dragOverIndice = -1;
  }

  onDragEnd(): void {
    this.dragItemIndice = -1;
    this.dragOverIndice = -1;
  }

  // ── IndovinaParola ─────────────────────────────────────────

  private inizializzaIndovinaParola(): void {
    if (this.domandaCorrente?.tipo === 'indovinaParola') {
      this.paroleDiGitate = new Array(this.domandaCorrente.risposte.length).fill('');
    } else {
      this.paroleDiGitate = [];
    }
  }

  // ── Collegamento ───────────────────────────────────────────

  private inizializzaCollegamento(): void {
    this.coppieSelezionate = [];
    this.sinistroSelezionato = null;
  }

  clicSinistra(id: string): void {
    if (this.feedback || this.invioInCorso) return;
    const pairIdx = this.coppieSelezionate.findIndex((c) => c.sinistroId === id);
    if (pairIdx !== -1) {
      this.coppieSelezionate = this.coppieSelezionate.filter((_, i) => i !== pairIdx);
      return;
    }
    this.sinistroSelezionato = this.sinistroSelezionato === id ? null : id;
  }

  clicDestra(testo: string): void {
    if (this.feedback || this.invioInCorso) return;
    const pairIdx = this.coppieSelezionate.findIndex((c) => c.destroTesto === testo);
    if (pairIdx !== -1) {
      this.coppieSelezionate = this.coppieSelezionate.filter((_, i) => i !== pairIdx);
      return;
    }
    if (!this.sinistroSelezionato) return;
    const sinistroTesto = this.domandaCorrente?.risposte.find((r) => r._id === this.sinistroSelezionato)?.testo ?? '';
    const colore = this.COLORI_COLLEGAMENTO[this.coppieSelezionate.length % this.COLORI_COLLEGAMENTO.length];
    this.coppieSelezionate = [
      ...this.coppieSelezionate,
      { sinistroId: this.sinistroSelezionato, sinistroTesto, destroTesto: testo, colore },
    ];
    this.sinistroSelezionato = null;
  }

  getColoreSinistra(id: string): string {
    return this.coppieSelezionate.find((c) => c.sinistroId === id)?.colore ?? '';
  }

  getColoreDestra(testo: string): string {
    return this.coppieSelezionate.find((c) => c.destroTesto === testo)?.colore ?? '';
  }

  // ── PuntaImmagine ──────────────────────────────────────────

  clicImmagine(event: MouseEvent): void {
    if (this.feedback || this.invioInCorso) return;
    const img = event.currentTarget as HTMLElement;
    const rect = img.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((event.clientY - rect.top) / rect.height) * 1000) / 10;
    this.puntoSelezionato = { x, y };
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
