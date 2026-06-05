/**
 * @file importaSentieriService.js
 * @description Servizio per l'importazione e il salvataggio dei sentieri escursionistici.
 * Interroga l'API Overpass per scaricare le relation/way di tipo "route=hiking"
 * nell'area comunale di Trento, converte il risultato in GeoJSON tramite osmtogeojson,
 * calcola lunghezza, dislivello e tempi di percorrenza con Turf.js e aggiorna
 * il database MongoDB con una bulk upsert (aggiorna se già presente, inserisce altrimenti).
 * Viene chiamato dal cron job settimanale in server.js e dall'endpoint admin /importa.
 */

const axios = require('axios');
const osmtogeojson = require('osmtogeojson');
const Sentiero = require('../models/Sentiero');
const turf = require('@turf/turf');
/**
 * Scarica i sentieri da Overpass API, li converte in GeoJSON e li salva su MongoDB.
 * Usa bulkWrite con upsert per aggiornare i sentieri esistenti e inserire i nuovi.
 *
 * @async
 * @returns {Object} Oggetto con i contatori dell'operazione
 *   (trovati_originali, salvati_filtrati, inseriti_nuovi, aggiornati)
 * @throws {Error} Se la richiesta a Overpass o il salvataggio fallisce
 */
async function importaSentieriDaOverpass() {
    try {
        console.log("Inizio download dati da Overpass...");

        const query = `
            [out:json][timeout:180];
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
            timeout: 600000
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