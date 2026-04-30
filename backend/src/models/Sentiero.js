// src/models/Sentiero.js
const mongoose = require('mongoose');

const sentieroSchema = new mongoose.Schema({
    osm_id: { 
        type: String, 
        required: true, 
        unique: true // Evita duplicati se lanci l'importazione due volte
    },
    // Salviamo tutte le info (nome, numero, difficoltà) qui dentro
    properties: { 
        type: Object 
    },
    // Salviamo le coordinate geografiche (GeoJSON)
    geometry: { 
        type: Object 
    }
}, { timestamps: true });

module.exports = mongoose.model('Sentiero', sentieroSchema);