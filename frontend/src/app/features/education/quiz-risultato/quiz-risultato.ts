/**
 * @file quiz-risultato.ts
 * @description Componente QuizRisultato — mostra il punteggio finale al termine di un quiz.
 * Riceve i dati del risultato tramite il router state passato da QuizSessione.
 * Corrisponde al Modulo Educazione del D2 sezione 1.3.
 * Implementa US-09 (punteggio finale), US-10 (riepilogo risposte) e US-14 (punti totali).
 */

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface VoceRiepilogo {
  idDomanda: string;
  corretta: boolean;
  puntiOttenuti: number;
  testoDomanda: string;
  testiRisposteDate: string[];
}

interface BadgeAggiornato {
  _id: string;
  nome: string;
  icona: string;
  percentuale: number;
  ottenuto: boolean;
}

interface RispostaDaRiepilogo {
  idDomanda: string;
  idRisposte: string[];
  corretta: boolean;
  puntiOttenuti: number;
  tipo?: string;
  coppie?: { sinistra: string; destra: string }[];
}

interface Risultato {
  punteggioOttenuto: number;
  punteggioMassimo: number;
  puntiAggiunti: number;
  puntiTotali: number;
  livello: number;
  riepilogoRisposte: RispostaDaRiepilogo[];
  badgeAggiornati?: BadgeAggiornato[];
}

interface DomandaSessione {
  _id: string;
  testo: string;
  risposte: { _id: string; testo: string }[];
}

@Component({
  selector: 'app-quiz-risultato',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-risultato.html',
  styleUrl: './quiz-risultato.css'
})
export class QuizRisultato implements OnInit {

  risultato: Risultato | null = null;
  riepilogo: VoceRiepilogo[] = [];
  badgeAggiornati: BadgeAggiornato[] = [];
  mostraRiepilogo: boolean = false;
  tempoScaduto: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const state = history.state as { risultato?: Risultato; domande?: DomandaSessione[] };
    if (state?.risultato) {
      this.risultato = state.risultato;
      this.tempoScaduto = !!(state.risultato as any).tempoScaduto;
      this.badgeAggiornati = state.risultato.badgeAggiornati ?? [];
      this.costruisciRiepilogo(state.risultato.riepilogoRisposte ?? [], state.domande ?? []);
    } else {
      this.router.navigate(['/educazione/quiz']);
    }
  }

  /**
   * US-10: costruisce il riepilogo arricchito unendo idDomanda con il testo
   * della domanda e delle risposte date, ricevuti dalla sessione via router state.
   */
  private costruisciRiepilogo(
    risposte: RispostaDaRiepilogo[],
    domande: DomandaSessione[]
  ): void {
    this.riepilogo = risposte.map((r) => {
      const domanda = domande.find((d) => d._id === r.idDomanda);
      let testiRisposte: string[];

      if (r.tipo === 'puntaImmagine') {
        testiRisposte = [r.corretta ? '✓ Punto individuato correttamente' : '✗ Punto non corretto'];
      } else if (r.tipo === 'collegamento') {
        testiRisposte = (r.coppie ?? []).map((c) => `${c.sinistra} → ${c.destra}`);
      } else {
        testiRisposte = (r.idRisposte ?? []).map((idR) => {
          const trovata = domanda?.risposte.find((ris) => ris._id === idR);
          return trovata?.testo ?? '—';
        });
      }

      return {
        idDomanda: r.idDomanda,
        corretta: r.corretta,
        puntiOttenuti: r.puntiOttenuti,
        testoDomanda: domanda?.testo ?? '—',
        testiRisposteDate: testiRisposte,
      };
    });
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
