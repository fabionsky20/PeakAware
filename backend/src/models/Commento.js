/**
 * @file Commento.js
 * @description Modello Mongoose per i commenti alle notizie del Cicerone.
 * Ogni commento è associato a un autore (Utente) e a una notizia (Notizia).
 * La cancellazione è consentita all'autore o agli admin tramite il controller.
 */

const mongoose = require('mongoose');

const commentoSchema = new mongoose.Schema({
  testo: {
    type: String,
    required: true
  },

  autore: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utente',
    required: true
  },

  notizia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notizia',
    required: true
  },

  dataCreazione: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Commento', commentoSchema);