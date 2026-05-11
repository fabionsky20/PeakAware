// src/controllers/sentieriController.js
const axios = require('axios');
const osmtogeojson = require('osmtogeojson');
const Sentiero = require('../models/Sentiero');
const turf = require('@turf/turf');

// 1. Funzione per SCARICARE, FILTRARE e SALVARE i sentieri
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
 */
exports.importaSentieriDaOverpass = async (req, res) => {
    console.log("📢 RICHIESTA RICEVUTA SULLA ROTTA IMPORTA!");
    try {
        console.log("Inizio download dati da Overpass...");

        const query = `
            [out:json][timeout:90];
            area["name"="Trento"]["admin_level"="8"]->.zona;
            (
                way["route"="hiking"](area.zona);
                relation["route"="hiking"](area.zona);
            );
            out geom;`;

        const params = new URLSearchParams();
        params.append('data', query);

        // Chiamata con Headers specifici per superare l'errore 406
        const response = await axios.post('https://overpass-api.de/api/interpreter', params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'PeakAwareApp/1.0', // User-agent più comune
                'Accept': 'application/json',
                'Accept-Encoding': 'identity' // Impedisce compressioni che causano il 406
            },
            timeout: 300000 // 5 minuti
        });

        console.log("Dati scaricati. Conversione e filtraggio...");
        const geojson = osmtogeojson(response.data);

        // --- FILTRO CRITICO: Teniamo solo i percorsi (linee), scartiamo i punti ---
        const sentieriFiltrati = geojson.features.filter(feature => 
            feature.geometry.type === 'LineString' || 
            feature.geometry.type === 'MultiLineString'
        );

        console.log(`Trovati ${sentieriFiltrati.length} percorsi validi. Salvataggio su MongoDB...`);

        const operazioniDb = sentieriFiltrati.map(feature => {
            const props = feature.properties;

            let lunghezza = props.distance;
            if (!lunghezza) {
                // Se non c'è la distanza, calcoliamola noi con Turf
                lunghezza = turf.length(feature, { units: 'kilometers' });
            }
            let dislivello = props.ascent ? parseInt(props.ascent) : 0;

            let durataAndata = props['duration:forward'];
            if (!durataAndata) {
                // Stima: 5 km/h, aggiungiamo 1 ora ogni 500m di dislivello
                durataAndata = (lunghezza / 5) + (dislivello / 500);
            }

            let durataRitorno = props['duration:backward'];
            if (!durataRitorno) {
                // Stima simile all'andata, ma con un po' meno tempo per il ritorno
                durataRitorno = (lunghezza / 5) + (dislivello / 800);
            }

           
            
            const durataMedia = (durataAndata + durataRitorno) / 2; // Stima: 5 km/h

            return {
                updateOne: {
                    filter: { osm_id: feature.id },
                    update: {
                        osm_id: feature.id,
                        properties: feature.properties,
                        geometry: feature.geometry,
                        lunghezza: parseFloat(lunghezza.toFixed(2)), // Lunghezza in km con 2 decimali
                        dislivello_positivo: dislivello, // Dislivello in metri
                        tempoAndata: parseFloat(durataAndata.toFixed(2)), // Tempo in ore con 2 decimali
                        tempoRitorno: parseFloat(durataRitorno.toFixed(2)),
                        durataMedia: parseFloat(durataMedia.toFixed(2)),
                        difficolta: props.difficulty || "Turistico", // Default a "Turistico" se non specificato
                        isVisible: true // Assicuriamoci che siano visibili di default
                    },
                    upsert: true
                }
            }
        });

        const risultato = await Sentiero.bulkWrite(operazioniDb);

        res.status(200).json({
            message: "Importazione completata con successo!",
            dettagli: {
                trovati_originali: geojson.features.length,
                salvati_filtrati: sentieriFiltrati.length,
                inseriti_nuovi: risultato.upsertedCount,
                aggiornati: risultato.modifiedCount
            }
        });

    } catch (error) {
        console.error("Errore durante l'importazione:", error.message);
        res.status(500).json({ error: "Errore durante l'interazione con Overpass o il DB" });
    }
};

// GET /api/sentieri - Recupera i sentieri visibili per la mappa
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
 */
exports.getAllSentieri = async (req, res) => {
    try {
        // Restituiamo direttamente l'array di sentieri per compatibilità con il service Angular
        const sentieri = await Sentiero.find({ isVisible: true }).select('osm_id properties geometry isVisible lunghezza dislivello_positivo tempoAndata tempoRitorno durataMedia difficolta');
        res.status(200).json(sentieri); 
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero dei sentieri" });
    }
};

// GET /api/sentieri/:id
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

// PATCH /api/sentieri/:id/visibilità
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
 *     responses:
 *       200:
 *         description: Stato visibilità aggiornato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 successo: { type: boolean }
 *                 isVisible: { type: boolean }
 *                 message: { type: string }
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