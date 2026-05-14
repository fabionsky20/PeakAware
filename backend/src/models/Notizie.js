const mongoose = require('mongoose');

const notiziaSchema = new mongoose.Schema({
  titolo: {
    type: String,
    required: true
  },
  contenuto: {
    type: String,
    required: true
  },
  autore: {
    type: String,
    required: true
  },
  dataPubblicazione: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notizia', notiziaSchema);