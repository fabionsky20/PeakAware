/**
 * @file VisiteUtente.js
 * @description Modello Mongoose per tracciare le visite degli utenti per categoria.
 * Ogni documento è univoco per coppia (utente, categoria) e tiene un contatore
 * di visite incrementato ogni volta che l'utente apre una notizia di quella categoria.
 * Usato da getNotiziеPersonalizzate per ordinare il feed per affinità.
 */

const mongoose = require('mongoose');

const visiteUtenteSchema = new mongoose.Schema({
  utente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utente',
    required: true
  },
  categoria: {
    type: String,
    required: true
  },
  visite: {
    type: Number,
    default: 1
  }
});

module.exports = mongoose.model('VisiteUtente', visiteUtenteSchema);