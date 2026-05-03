/**
 * @file SessioneQuiz.js
 * @description Modello Mongoose per la classe SessioneQuiz.
 * Corrisponde alla classe SessioneQuiz del diagramma delle classi (D2 sezione 2.3).
 * Traccia lo stato di avanzamento di un utente durante un quiz:
 * le risposte date, i punti accumulati e se la sessione è ancora in corso.
 */

const mongoose = require('mongoose');

/**
 * Schema per una singola risposta data dall'utente durante la sessione.
 * Registra quale domanda è stata risposta, quale risposta è stata scelta
 * e se era corretta, così da poter calcolare il punteggio finale e
 * mostrare il riepilogo a fine quiz.
 */
const rispostaDataSchema = new mongoose.Schema({
  idDomanda: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, // ID della domanda a cui si riferisce
  },

  idRisposte: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [], // IDs delle risposte scelte dall'utente (array per supportare risposte multiple)
  },

  corretta: {
    type: Boolean,
    required: true,
  },

  puntiOttenuti: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
});

/**
 * Schema Mongoose per l'entità SessioneQuiz.
 * Una sessione nasce quando l'utente avvia un quiz e termina quando
 * lo completa o abbandona. Permette di implementare il feedback
 * immediato dopo ogni risposta (US-08) e il punteggio finale (US-09).
 */
const sessioneQuizSchema = new mongoose.Schema(
  {
    idUtente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utente',
      required: [true, 'La sessione deve essere associata a un utente'],
    },

    idQuiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'La sessione deve essere associata a un quiz'],
    },

    /**
     * Elenco delle risposte date dall'utente nel corso della sessione.
     * Viene popolato progressivamente a ogni chiamata all'endpoint /rispondi.
     */
    risposteDate: {
      type: [rispostaDataSchema],
      default: [],
    },

    punteggioOttenuto: {
      type: Number,
      default: 0,
      min: [0, 'Il punteggio non può essere negativo'],
    },

    inCorso: {
      type: Boolean,
      default: true,
    },

    terminata: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt = momento di avvio, updatedAt = ultima risposta
  }
);

module.exports = mongoose.model('SessioneQuiz', sessioneQuizSchema);
