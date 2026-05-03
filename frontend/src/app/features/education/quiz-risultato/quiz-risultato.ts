/**
 * @file quiz-risultato.ts
 * @description Componente QuizRisultato — mostra il punteggio finale al termine di un quiz.
 * Riceve i dati del risultato tramite il router state passato da QuizSessione.
 * Corrisponde al Modulo Educazione del D2 sezione 1.3.
 * Implementa US-09 (punteggio finale) e US-14 (punti totali accumulati).
 */

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface Risultato {
  punteggioOttenuto: number;
  punteggioMassimo: number;
  puntiAggiunti: number;
  puntiTotali: number;
  livello: number;
}

@Component({
  selector: 'app-quiz-risultato',
  standalone: true,
  imports: [],
  templateUrl: './quiz-risultato.html',
  styleUrl: './quiz-risultato.css'
})
export class QuizRisultato implements OnInit {

  risultato: Risultato | null = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const state = history.state as { risultato?: Risultato };
    if (state?.risultato) {
      this.risultato = state.risultato;
    } else {
      this.router.navigate(['/educazione/quiz']);
    }
  }

  /**
   * Percentuale di risposte corrette sul punteggio massimo.
   *
   * @returns Numero intero tra 0 e 100
   */
  get percentuale(): number {
    if (!this.risultato || this.risultato.punteggioMassimo === 0) return 0;
    return Math.round((this.risultato.punteggioOttenuto / this.risultato.punteggioMassimo) * 100);
  }

  /**
   * Messaggio motivazionale basato sulla percentuale ottenuta.
   *
   * @returns Stringa con il messaggio
   */
  get messaggio(): string {
    if (this.percentuale >= 80) return 'Ottimo risultato!';
    if (this.percentuale >= 50) return 'Buona prova!';
    return 'Continua ad allenarti!';
  }

  tornaAiQuiz(): void {
    this.router.navigate(['/educazione/quiz']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
