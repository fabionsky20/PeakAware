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