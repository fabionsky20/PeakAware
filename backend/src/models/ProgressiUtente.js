/**
 * @file ProgressiUtente.js
 * @description Modello Mongoose per la classe ProgressiUtente.
 * Corrisponde alla classe ProgressiUtente del diagramma delle classi (D2 sezione 2.2).
 * Tiene traccia dei punti, del livello, dei quiz completati e dei badge ottenuti.
 * Ogni utente ha esattamente un documento ProgressiUtente (unique su idUtente).
 */

const mongoose = require('mongoose');

/**
 * Schema per un singolo quiz completato dall'utente.
 * Memorizza riferimento al quiz, punteggio ottenuto sul massimo e data di completamento.
 * Supporta US-14 (punti totali) e US-16 (quiz già completati, D4).
 */
const quizCompletatoSchema = new mongoose.Schema({
  idQuiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },

  punteggio: {
    type: Number,
    required: true,
    min: 0,
  },

  punteggioMassimo: {
    type: Number,
    required: true,
    min: 0,
  },

  completatoIl: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Schema Mongoose per l'entità ProgressiUtente.
 * Corrisponde alla classe ProgressiUtente del D2 sezione 2.2.
 * I campi badge e esperienzaRaggiunta sono presenti nello schema ma verranno
 * popolati nelle funzionalità previste per il D4.
 */
const progressiUtenteSchema = new mongoose.Schema(
  {
    idUtente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utente',
      required: [true, 'I progressi devono essere associati a un utente'],
      unique: true,
    },

    /**
     * Punti totali accumulati tramite quiz e attività educative.
     * Corrisponde all'attributo punti del D2. Viene incrementato a ogni
     * completamento di sessione quiz insieme a Utente.punti.
     * Implementa il requisito US-14.
     */
    punti: {
      type: Number,
      default: 0,
      min: [0, 'I punti non possono essere negativi'], // OCL constraint #2
    },

    /**
     * Livello corrente derivato dai punti accumulati.
     * Corrisponde all'attributo livello del D2.
     * Viene ricalcolato ogni volta che i punti vengono aggiornati.
     */
    livello: {
      type: Number,
      default: 1,
      min: 1,
    },

    /**
     * Array degli id dei badge ottenuti dall'utente.
     * Corrisponde all'attributo badge del D2. Sarà popolato nel D4.
     */
    badge: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Badge',
      default: [],
    },

    /**
     * Esperienza in montagna maturata tramite la piattaforma.
     * Corrisponde all'attributo esperienzaRaggiunta del D2.
     */
    esperienzaRaggiunta: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Array dei quiz completati con punteggio e data.
     * Cresce ogni volta che l'utente termina una sessione quiz.
     */
    quizCompletati: {
      type: [quizCompletatoSchema],
      default: [],
    },

    /**
     * Data dell'ultima attività registrata.
     * Corrisponde all'attributo dataUltimaAttivita del D2.
     * Aggiornata ogni volta che l'utente completa un quiz.
     */
    dataUltimaAttivita: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ProgressiUtente', progressiUtenteSchema);
