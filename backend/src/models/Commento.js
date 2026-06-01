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