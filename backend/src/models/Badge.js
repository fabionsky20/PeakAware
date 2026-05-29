/**
 * @file Badge.js
 * @description Modello Mongoose per i badge del modulo educazione.
 * I badge testimoniano i progressi dell'utente e vengono usati dal Cicerone
 * per personalizzare i consigli in base agli interessi dimostrati.
 */

const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'Il nome del badge è obbligatorio'],
      trim: true,
    },

    descrizione: {
      type: String,
      required: [true, 'La descrizione del badge è obbligatoria'],
      trim: true,
    },

    // Emoji o, in futuro, percorso/URL immagine PNG
    icona: {
      type: String,
      default: '🏅',
    },

    /**
     * Condizione per ottenere il badge.
     * tipo 'punti':     raggiungere sogliaPunti punti quiz
     * tipo 'categoria': completare tutti i quiz delle categorie elencate
     */
    condizione: {
      tipo: {
        type: String,
        enum: ['punti', 'categoria'],
        required: true,
      },
      sogliaPunti: {
        type: Number,
        min: 0,
      },
      categorie: {
        type: [String],
        default: [],
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Badge', badgeSchema);
