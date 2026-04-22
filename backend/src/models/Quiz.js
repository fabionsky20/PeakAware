/**
 * @file Quiz.js
 * @description Modello Mongoose per la classe Quiz.
 * Corrisponde alla classe Quiz del diagramma delle classi (D2 sezione 2.3).
 * Un Quiz è composto da Domande, ciascuna con le proprie Risposte.
 */

const mongoose = require('mongoose');

/**
 * Schema per una singola Risposta.
 * Corrisponde alla classe Risposta del D2 sezione 2.3.
 * Usata come sotto-documento embedded dentro Domanda.
 */
const rispostaSchema = new mongoose.Schema({
  testo: {
    type: String,
    required: [true, 'Il testo della risposta è obbligatorio'],
    trim: true,
  },

  eCorretta: {
    type: Boolean,
    required: true,
    default: false, // Solo una risposta per domanda avrà eCorretta: true
  },
});

/**
 * Schema per una singola Domanda.
 * Corrisponde alla classe Domanda del D2 sezione 2.3.
 * Usata come sotto-documento embedded dentro Quiz.
 * Contiene un array di Risposte.
 */
const domandaSchema = new mongoose.Schema({
  testo: {
    type: String,
    required: [true, 'Il testo della domanda è obbligatorio'],
    trim: true,
  },

  tipo: {
    type: String,
    enum: ['multipla', 'veroFalso', 'aperta'],
    default: 'multipla',
  },

  tempo: {
    type: Number,
    default: 0, // 0 = nessun limite di tempo
    min: 0,
  },

  puntiChevale: {
    type: Number,
    required: true,
    default: 10, // Punti assegnati per risposta corretta
    min: 0,
  },

  tentativi: {
    type: Number,
    default: 1, // Numero massimo di tentativi consentiti
    min: 1,
  },

  /**
   * Array di risposte embedded.
   * Implementa il constraint OCL #5: ogni domanda deve avere
   * almeno una risposta con eCorretta = true.
   */
  risposte: {
    type: [rispostaSchema],
    validate: {
      validator: function (risposte) {
        // OCL constraint #5: almeno una risposta corretta per domanda
        return risposte.some((r) => r.eCorretta === true);
      },
      message: 'Ogni domanda deve avere almeno una risposta corretta (OCL #5)',
    },
  },
});

/**
 * Schema Mongoose per l'entità Quiz.
 * Corrisponde alla classe Quiz del D2 sezione 2.3.
 * Implementa i constraint OCL #5, #6, #7, #8.
 */
const quizSchema = new mongoose.Schema(
  {
    titolo: {
      type: String,
      required: [true, 'Il titolo del quiz è obbligatorio'],
      trim: true,
    },

    argomento: {
      type: String,
      required: [true, 'L\'argomento del quiz è obbligatorio'],
      trim: true,
    },

    categoria: {
      type: String,
      enum: ['meteo', 'valanghe', 'orientamento', 'fauna', 'prontoSoccorso', 'generale'],
      default: 'generale',
    },

    difficolta: {
      type: Number,
      min: [1, 'La difficoltà minima è 1'],
      max: [5, 'La difficoltà massima è 5'],
      default: 1,
    },

    etaConsigliata: {
      type: Number,
      min: 0,
      default: 0, // 0 = adatto a tutti
    },

    tipo: {
      type: String,
      enum: ['multipla', 'veroFalso', 'misto'],
      default: 'multipla',
    },

    tempo: {
      type: Number,
      default: 0, // 0 = nessun limite di tempo
      min: 0,
    },

    punteggio: {
      type: Number,
      default: 100, // Punteggio massimo ottenibile
      min: 0,
    },

    /**
     * Stato del quiz: indica se è in corso o terminato.
     * Usato per i constraint OCL #6 e #7.
     */
    inCorso: {
      type: Boolean,
      default: false,
    },

    terminato: {
      type: Boolean,
      default: false,
    },

    /**
     * Riferimento all'utente admin/SAT che ha creato il quiz.
     * Corrisponde al componente Gestione Contenuti del D2.
     */
    idAutore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utente',
      default: null,
    },

    // Array di domande embedded nel quiz
    domande: [domandaSchema],
  },
  {
    timestamps: true, // createdAt e updatedAt automatici
  }
);

module.exports = mongoose.model('Quiz', quizSchema);