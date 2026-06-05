/**
 * @file Configurazione.js
 * @description Modello Mongoose per la configurazione globale dell'applicazione.
 * Ogni documento è una coppia chiave/valore generico (Mixed).
 * Usato principalmente per la chiave 'app_config' che contiene
 * trailConfig (soglie CAI sentieri) ed equipConfig (lista attrezzatura),
 * modificabili dagli admin tramite l'interfaccia di configurazione.
 */

const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  chiave: { type: String, required: true, unique: true },
  valore: { type: mongoose.Schema.Types.Mixed, required: true }
});

module.exports = mongoose.model('Configurazione', configSchema);