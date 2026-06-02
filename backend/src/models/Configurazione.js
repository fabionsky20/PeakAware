const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  chiave: { type: String, required: true, unique: true },
  valore: { type: mongoose.Schema.Types.Mixed, required: true }
});

module.exports = mongoose.model('Configurazione', configSchema);