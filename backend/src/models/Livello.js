/**
 * @file Livello.js
 * @description Modello Mongoose per i livelli di esperienza utente.
 * Ogni livello ha un numero progressivo (1-N), un nome descrittivo
 * e una soglia di puntiNecessari per raggiungerlo.
 * I livelli vengono letti al login per calcolare il livello corrente
 * dell'utente in base ai puntiQuiz accumulati.
 */

const mongoose = require('mongoose');

const livelloSchema = new mongoose.Schema({
  numero: { type: Number, required: true, unique: true, min: 1 },
  nome:   { type: String, required: true, trim: true },
  puntiNecessari: { type: Number, required: true, min: 0 },
}, { timestamps: false });

module.exports = mongoose.model('Livello', livelloSchema);
