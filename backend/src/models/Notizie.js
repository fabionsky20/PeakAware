/**
 * @file Notizie.js
 * @description Modello Mongoose per le notizie del Modulo Cicerone.
 * Il campo contenuto è Mixed perché contiene il formato JSON di EditorJS
 * (array di blocchi: paragrafi, intestazioni, immagini, ecc.).
 * Il campo visite tiene il conteggio aggregato delle visualizzazioni
 * e viene usato per l'ordinamento per popolarità.
 */

const mongoose = require('mongoose');

const notiziaSchema = new mongoose.Schema({
  titolo: {
    type: String,
    required: true
  },
  contenuto: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  categoria: {
    type: String,
    enum: ['meteo', 'valanghe', 'orientamento', 'fauna', 'prontoSoccorso', 'generale'],
    default: 'generale'
  },
  visite: {
    type: Number,
    default: 0
  },
  idAutore: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utente',
    required: true
  },
  dataPubblicazione: {
    type: Date,
    default: Date.now
  },
});

module.exports = mongoose.model('Notizia', notiziaSchema);