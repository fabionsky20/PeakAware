/**
 * @file Video.js
 * @description Modello Mongoose per la classe Video.
 * Corrisponde alla classe Video del D2 sezione 2.3.
 * I video possono appartenere al Modulo Educazione (sicurezza)
 * o al Modulo Divulgazione (territorio).
 */

const mongoose = require('mongoose');

/**
 * Schema Mongoose per l'entità Video.
 */
const videoSchema = new mongoose.Schema(
  {
    titolo: {
      type: String,
      required: [true, 'Il titolo del video è obbligatorio'],
      trim: true,
    },

    descrizione: {
      type: String,
      trim: true,
      default: '',
    },

    url: {
      type: String,
      required: [true, 'L\'URL del video è obbligatorio'],
      trim: true,
    },

    entePubblicatore: {
      type: String,
      trim: true,
      default: 'PeakAware',
    },

    argomento: {
      type: String,
      trim: true,
      default: 'generale',
    },

    /**
     * Modulo di appartenenza del video.
     * 'educazione' = sicurezza e rischi (Modulo Educazione)
     * 'divulgazione' = territorio e storia (Modulo Divulgazione)
     */
    modulo: {
      type: String,
      enum: ['educazione', 'divulgazione'],
      default: 'educazione',
    },

    livello: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },

    tag: {
      type: [String], // Array di parole chiave per ricerca
      default: [],
    },

    durata: {
      type: Number, // Durata in secondi
      default: 0,
      min: 0,
    },

    /**
     * Riferimento all'utente admin/SAT che ha pubblicato il video.
     */
    idAutore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utente',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Video', videoSchema);