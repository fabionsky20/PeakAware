// src/services/importaSentieriService.js
const axios = require('axios');
const osmtogeojson = require('osmtogeojson');
const Sentiero = require('../models/Sentiero');
const turf = require('@turf/turf');
async function importaSentieriDaOverpass() {
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
            out body geom;`;
      

        const params = new URLSearchParams();
        params.append('data', query);

        const response = await axios.post('https://overpass-api.de/api/interpreter', params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'PeakAwareApp/1.0',
                'Accept': 'application/json',
                'Accept-Encoding': 'identity'
            },
            timeout: 300000
        });

        console.log("Dati scaricati. Conversione e filtraggio...");
        const geojson = osmtogeojson(response.data);

        const sentieriFiltrati = geojson.features.filter(feature =>
            feature.geometry?.type === 'LineString' ||
            feature.geometry?.type === 'MultiLineString'
        );

        console.log(`Trovati ${sentieriFiltrati.length} percorsi validi. Salvataggio su MongoDB...`);

        const operazioniDb = sentieriFiltrati.map(feature => {
            const props = feature.properties || {};

            // Lunghezza: da OSM oppure calcolata con Turf
            let lunghezza = props.distance ? parseFloat(props.distance) : null;
            if (!lunghezza || isNaN(lunghezza)) {
                lunghezza = turf.length(feature, { units: 'kilometers' });
            }

            // Dislivello positivo: tag OSM "ascent"
            const dislivello = props.ascent ? parseInt(props.ascent) : 0;

            // Tempi: tag OSM "duration:forward/backward" (formato "HH:MM") oppure stima
            const parseOsmDuration = (str) => {
                if (!str) return null;
                // Formato "HH:MM" → ore decimali
                const match = str.match(/^(\d+):(\d{2})$/);
                if (match) return parseInt(match[1]) + parseInt(match[2]) / 60;
                // Già numero (minuti o ore)
                const n = parseFloat(str);
                return isNaN(n) ? null : n;
            };

            const tempoAndataOsm  = parseOsmDuration(props['duration:forward']);
            const tempoRitornoOsm = parseOsmDuration(props['duration:backward']);

            // Stima: 4 km/h + 1h ogni 500m dislivello
            const tempoAndata  = tempoAndataOsm  ?? parseFloat(((lunghezza / 4) + (dislivello / 500)).toFixed(2));
            const tempoRitorno = tempoRitornoOsm ?? parseFloat(((lunghezza / 4) + (dislivello / 800)).toFixed(2));

            const difficolta = props.difficulty || 'Turistico';

            return {
                updateOne: {
                    filter: { osm_id: feature.id },
                    update: {
                        $set: {
                            osm_id:              feature.id,
                            properties:          props,          // tutti i tag OSM grezzi
                            geometry:            feature.geometry,
                            lunghezza:           parseFloat(lunghezza.toFixed(2)),
                            dislivello_positivo: dislivello,
                            tempoAndata,
                            tempoRitorno,
                            difficolta,
                            isVisible:           true
                        }
                    },
                    upsert: true
                }
            };
        });

        const risultato = await Sentiero.bulkWrite(operazioniDb);

        return ({
            message: "Importazione completata con successo!",
            dettagli: {
                trovati_originali:  geojson.features.length,
                salvati_filtrati:   sentieriFiltrati.length,
                inseriti_nuovi:     risultato.upsertedCount,
                aggiornati:         risultato.modifiedCount
            }
        });

    } catch (error) {
        console.error("Errore durante l'importazione:", error.message);
        throw new Error("Errore durante l'interazione con Overpass o il DB");
    }
};

module.exports = { importaSentieriDaOverpass };