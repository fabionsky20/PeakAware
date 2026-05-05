// src/controllers/sentieriController.js
const axios = require('axios');
const osmtogeojson = require('osmtogeojson');
const Sentiero = require('../models/Sentiero');

// 1. Funzione per SCARICARE, FILTRARE e SALVARE i sentieri
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

        const operazioniDb = sentieriFiltrati.map(feature => ({
            updateOne: {
                filter: { osm_id: feature.id },
                update: {
                    osm_id: feature.id,
                    properties: feature.properties,
                    geometry: feature.geometry,
                    isVisible: true // Assicuriamoci che siano visibili di default
                },
                upsert: true
            }
        }));

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
exports.getAllSentieri = async (req, res) => {
    try {
        // Restituiamo direttamente l'array di sentieri per compatibilità con il service Angular
        const sentieri = await Sentiero.find({ isVisible: true }).select('osm_id properties geometry isVisible');
        res.status(200).json(sentieri); 
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero dei sentieri" });
    }
};

// GET /api/sentieri/:id
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
exports.toggleVisibilita = async (req, res) => {
    try {
        const sentiero = await Sentiero.findOne({ osm_id: req.params.id });
        if (!sentiero) return res.status(404).json({ message: "Sentiero non trovato" });

        sentiero.isVisible = !sentiero.isVisible;
        await sentiero.save();
        
        res.status(200).json({
            successo: true,
            isVisible: sentiero.isVisible,
            message: `Sentiero ${sentiero.isVisible ? 'attivato' : 'disattivata'}`
        });
    } catch (error) {
        res.status(500).json({ error: "Errore nella modifica visibilità" });
    }
};