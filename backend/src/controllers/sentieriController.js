// src/controllers/sentieriController.js
const axios = require('axios');
const osmtogeojson = require('osmtogeojson');
const Sentiero = require('../models/Sentiero');


// 1. Funzione per SCARICARE e SALVARE i sentieri
exports.importaSentieriDaOverpass = async (req, res) => {
    console.log("📢 RICHIESTA RICEVUTA SULLA ROTTA IMPORTA!");
    try {
        console.log("Inizio download dati da Overpass...");

        // Query Overpass (Esempio: cerchiamo i sentieri SAT in una zona specifica per non bloccare il server durante i test)
        const query =  `
            [out:json][timeout:60];
            // Cerchiamo l'area del comune di Trento
            area["name"="Trento"]["admin_level"="8"]->.zona;
            
            // Cerchiamo tutti i percorsi escursionistici (hiking)
            (
            way["route"="hiking"](area.zona);
            relation["route"="hiking"](area.zona);
            );

            // Visualizza i risultati con le geometrie (linee blu sulla mappa)
            out geom;`

    // 1. Usiamo URLSearchParams per un encoding perfetto del body
    const params = new URLSearchParams();
    params.append('data', query);

    // 2. Chiamata con Headers personalizzati per evitare il 406
    const response = await axios.post('https://overpass-api.de/api/interpreter', params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'PeakAware-App/1.0 (https://iltuosito.it)', // Identifica la tua app
            'Accept-Encoding': 'identity' // Fondamentale: dice al server di non comprimere la risposta
        },
        timeout: 300000 // 5 minuti, per query più grandi
    });

        
        console.log("Dati scaricati. Conversione in GeoJSON...");
        // Convertiamo il formato di OpenStreetMap in GeoJSON
        const geojson = osmtogeojson(response.data);

        console.log(`Trovati ${geojson.features.length} sentieri. Salvataggio su MongoDB...`);

        // Prepariamo un "BulkWrite" per salvare tutto velocemente senza sovraccaricare il DB
        const operazioniDb = geojson.features.map(feature => ({
            updateOne: {
                filter: { osm_id: feature.id }, // Cerca per ID
                update: {
                    osm_id: feature.id,
                    properties: feature.properties,
                    geometry: feature.geometry
                },
                upsert: true // Crea se non esiste, aggiorna se esiste
            }
        }));

        // Eseguiamo il salvataggio massivo
        const risultato = await Sentiero.bulkWrite(operazioniDb);

        res.status(200).json({
            message: "Importazione completata con successo!",
            dettagli: {
                sentieri_trovati: geojson.features.length,
                inseriti_nuovi: risultato.upsertedCount,
                aggiornati: risultato.modifiedCount
            }
        });

    } catch (error) {
        console.error("Errore durante l'importazione:", error);
        res.status(500).json({ error: "Errore durante il salvataggio su MongoDB" });
    }
};

// // 2. Funzione per VERIFICARE/VISUALIZZARE cosa c'è nel Database, usata inizialmente per test
// exports.getSentieriSalvati = async (req, res) => {
//     try {
//         // Cerca tutti i sentieri nel DB (selezioniamo solo alcune info per non appesantire la risposta)
//         const sentieri = await Sentiero.find().select('osm_id properties.ref properties.name -_id').limit(50); // Mostra i primi 50

//         const conteggioTotale = await Sentiero.countDocuments();

//         res.status(200).json({
//             totale_nel_database: conteggioTotale,
//             primi_50_risultati: sentieri
//         });
//     } catch (error) {
//         res.status(500).json({ error: "Errore nella lettura dal database" });
//     }
// };
//GET /api/sentieri - Recupera tutti i sentieri visibili (isVisible: true) per la mappa
exports.getAllSentieri = async (req, res) => {
    try{
        // Cerca tutti i sentieri visibili nel DB 
        const sentieri = await Sentiero.find({ isVisible: true }).select('osm_id properties geometry'); //vogliamo le proprietà geometriche per poter visualizzare i sentieri sulla mappa

        res.status(200).json({sentieri});

    }catch (error){
        res.status(500).json({ error: "Errore nella recuperare i sentieri" });
    }
};
// GET /api/sentieri/:id - Recupera un sentiero specifico per ID (osm_id)
exports.getSentieroById = async (req, res) => {
    try {
        const sentiero = await Sentiero.findOne({ osm_id: req.params.id });
        //se il sentiero non esiste, restituisci un errore 404
        if (!sentiero) {
            return res.status(404).json({ message: "Sentiero non trovato" });
        }
        res.status(200).json({ sentiero });

    } catch (error) {
        res.status(500).json({ error: "Errore nella recuperare il sentiero" });
    }

};
//PATCH /api/sentieri/:id/visibilità - Cambia la visibilità di un sentiero (isVisible true/false) - solo per Admin
exports.toggleVisibilitàSentiero = async (req, res) => {
    try {
        const sentiero = await Sentiero.findOne({ osm_id: req.params.id });
        //se il sentiero non esiste, restituisci un errore 404
        if (!sentiero) {
            return res.status(404).json({ message: "Sentiero non trovato" });
        }
        // Inverti la visibilità
        sentiero.isVisible = !sentiero.isVisible;
        await sentiero.save();
        res.status(200).json({ 
            successo: true,
            message: `Visibilità del sentiero ${sentiero.isVisible ? 'attivata' : 'disattivata'}` });

    } catch (error) {
        res.status(500).json({ error: "Errore nella modificare la visibilità del sentiero" });
    }
}