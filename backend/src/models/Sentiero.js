// src/models/Sentiero.js
const mongoose = require('mongoose');
/**
 * @openapi
 * components:
 *   schemas:
 *     Sentiero:
 *       type: object
 *       required:
 *         - osm_id
 *         - geometry
 *       properties:
 *         osm_id:
 *           type: string
 *           description: Identificativo univoco di OpenStreetMap
 *           example: "way/12345678"
 *         isVisible:
 *           type: boolean
 *           description: Gestisce la visibilità del sentiero nella mappa
 *           default: true
 *         properties:
 *           type: object
 *           description: Metadati del sentiero recuperati da OSM
 *           properties:
 *             name:
 *               type: string
 *               description: Nome ufficiale del sentiero
 *             ref:
 *               type: string
 *               description: Riferimento numerico (es. SAT 401)
 *             difficulty:
 *               type: string
 *               description: Grado di difficoltà tecnica
 *             description:
 *               type: string
 *               description: Descrizione dettagliata del percorso
 *         geometry:
 *           type: object
 *           description: Dati GeoJSON del tracciato
 *           properties:
 *             type:
 *               type: string
 *               enum: [LineString, MultiLineString]
 *             coordinates:
 *               type: array
 *               items:
 *                 type: array
 *                 items:
 *                   type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
// schema di documento che il backend manda al frontend, con tutte le info che servono per visualizzare i sentieri sulla mappa
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