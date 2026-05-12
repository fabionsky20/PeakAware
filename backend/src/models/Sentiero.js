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
 *           example: "relation/129320"
 *         isVisible:
 *           type: boolean
 *           default: true
 *         properties:
 *           type: object
 *           description: Tutti i tag OSM del sentiero (schema libero)
 *           additionalProperties:
 *             type: string
 *         lunghezza:
 *           type: number
 *           description: Lunghezza calcolata in km
 *         dislivello_positivo:
 *           type: number
 *           description: Dislivello positivo in metri
 *         tempoAndata:
 *           type: number
 *           description: Tempo stimato andata in ore
 *         tempoRitorno:
 *           type: number
 *           description: Tempo stimato ritorno in ore
 *         difficolta:
 *           type: string
 *         geometry:
 *           type: object
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
 */
const sentieroSchema = new mongoose.Schema({
    osm_id: {
        type: String,
        required: true,
        unique: true
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    properties: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    lunghezza:            { type: Number },
    dislivello_positivo:  { type: Number },
    tempoAndata:          { type: Number },
    tempoRitorno:         { type: Number },
    difficolta:           { type: String, default: 'Turistico' },
    geometry: {
        type:        { type: String, enum: ['LineString', 'MultiLineString'], required: true },
        coordinates: { type: Array, required: true }
    }
}, { timestamps: true });

sentieroSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('Sentiero', sentieroSchema);