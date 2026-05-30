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
  idAutore: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utente',
    required: true
  },
  dataPubblicazione: {
    type: Date,
    default: Date.now
  },
  preferanza: {
    type: String,
    enum: ['alta', 'media', 'bassa'],
    default: 'bassa'
  }
});

module.exports = mongoose.model('Notizia', notiziaSchema);