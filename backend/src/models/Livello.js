const mongoose = require('mongoose');

const livelloSchema = new mongoose.Schema({
  numero: { type: Number, required: true, unique: true, min: 1 },
  nome:   { type: String, required: true, trim: true },
  puntiNecessari: { type: Number, required: true, min: 0 },
}, { timestamps: false });

module.exports = mongoose.model('Livello', livelloSchema);
