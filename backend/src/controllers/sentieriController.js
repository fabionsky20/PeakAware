// src/controllers/sentieriController.js
const axios = require('axios');
const osmtogeojson = require('osmtogeojson');
const Sentiero = require('../models/Sentiero');
const turf = require('@turf/turf');
const { importaSentieriDaOverpass } = require('../services/importaSentieriService');
/**
 * @openapi
 * /api/sentieri/importa:
 *   post:
 *     summary: Forza l'importazione dei sentieri da Overpass API
 *     tags:
 *       - Admin
 *     operationId: importaSentieriDaOverpass
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Importazione completata
 *       500:
 *         description: Errore durante l'importazione
 */
exports.importaSentieriDaOverpass = async (req, res) => {
    console.log("📢 RICHIESTA RICEVUTA SULLA ROTTA IMPORTA!");
    try {
        const dettagli = await importaSentieriDaOverpass();
        res.status(200).json({ message: "Importazione completata con successo!", dettagli });
    } catch (error) {
        console.error("Errore durante l'importazione:", error.message);
        res.status(500).json({ error: "Errore durante l'interazione con Overpass o il DB" });
    }
};

/**
 * @openapi
 * /api/sentieri:
 *   get:
 *     summary: Recupera tutti i sentieri visibili
 *     tags:
 *       - Sentieri
 *     operationId: getAllSentieri
 *     responses:
 *       200:
 *         description: Array di sentieri
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Sentiero'
 *       500:
 *         description: Errore nel recupero
 */
exports.getAllSentieri = async (req, res) => {
    try {
        const sentieri = await Sentiero.find({ isVisible: true })
            .select('osm_id properties geometry isVisible lunghezza dislivello_positivo tempoAndata tempoRitorno difficolta');
        res.status(200).json(sentieri);
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero dei sentieri" });
    }
};

/**
 * @openapi
 * /api/sentieri/{id}:
 *   get:
 *     summary: Recupera un singolo sentiero per osm_id
 *     tags:
 *       - Sentieri
 *     operationId: getSentieroById
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'osm_id del sentiero
 *     responses:
 *       200:
 *         description: Dati del sentiero
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sentiero'
 *       404:
 *         description: Sentiero non trovato
 *       500:
 *         description: Errore nel recupero
 */
exports.getSentieroById = async (req, res) => {
    try {
        const sentiero = await Sentiero.findOne({ osm_id: req.params.id });
        if (!sentiero) return res.status(404).json({ message: "Sentiero non trovato" });
        res.status(200).json(sentiero);
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero del sentiero" });
    }
};

/**
 * @openapi
 * /api/sentieri/{id}/toggleVisibilita:
 *   patch:
 *     summary: Cambia lo stato di visibilità di un sentiero
 *     tags:
 *       - Admin
 *     operationId: toggleVisibilita
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'osm_id del sentiero
 *     responses:
 *       200:
 *         description: Stato visibilità aggiornato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 successo:
 *                   type: boolean
 *                 isVisible:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Sentiero non trovato
 *       500:
 *         description: Errore nella modifica
 */
exports.toggleVisibilita = async (req, res) => {
    try {
        const sentiero = await Sentiero.findOne({ osm_id: req.params.id });
        if (!sentiero) return res.status(404).json({ message: "Sentiero non trovato" });

        sentiero.isVisible = !sentiero.isVisible;
        await sentiero.save();

        res.status(200).json({
            successo: true,
            isVisible: sentiero.isVisible,
            message: `Sentiero ${sentiero.isVisible ? 'attivato' : 'disattivato'}`
        });
    } catch (error) {
        res.status(500).json({ error: "Errore nella modifica visibilità" });
    }
};