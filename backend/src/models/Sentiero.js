// src/models/Sentiero.js
const mongoose = require('mongoose');
// schema di documennto che il backend manda al frontend, con tutte le info che servono per visualizzare i sentieri sulla mappa
const sentieroSchema = new mongoose.Schema({
    osm_id: { 
        type: String, 
        required: true, 
        unique: true // Evita duplicati se lanci l'importazione due volte
    },
    isVisible: { // Campo per gestire la visibilità del sentiero sulla mappa
        type: Boolean,
        default: true 
    },
    // Salviamo tutte le info (nome, numero, difficoltà) qui dentro
    properties: { 
        name: String,
        ref: String,
        difficulty: String,
        description: String,
        // Potenziali altri campi utili da OSM
    },
    // Salviamo le coordinate geografiche (GeoJSON)
    geometry: { 
        type: {type: String, enum: ['LineString', 'MultiLineString'], required: true},
            coordinates: {type: Array, required: true} 
        }
    
}, { timestamps: true });

// Indice spaziale per future query geografiche
sentieroSchema.index({ geometry: "2dsphere" });

module.exports = mongoose.model('Sentiero', sentieroSchema);