/**
 * @file configRoutes.js
 * @description Route Express per la configurazione globale dell'applicazione.
 * Espone un endpoint pubblico di lettura e uno protetto di scrittura (solo admin).
 * La configurazione contiene trailConfig (soglie CAI per i sentieri) e
 * equipConfig (lista attrezzatura consigliata), modificabili dall'interfaccia admin.
 */

const express = require('express');
const router = express.Router();
const Configurazione = require('../models/Configurazione');
const { proteggi, soloAdmin } = require('../middleware/auth');

/**
 * GET /api/config
 * Pubblica — restituisce la configurazione globale (chiave 'app_config').
 * Se non esiste ancora, restituisce un oggetto vuoto.
 */
router.get('/', async (req, res) => {
  try {
    const conf = await Configurazione.findOne({ chiave: 'app_config' });
    res.status(200).json(conf ? conf.valore : {});
  } catch (err) { 
    res.status(500).json({ error: 'Errore DB' }); 
  }
});

/**
 * PUT /api/config
 * Protetta — solo admin possono aggiornare la configurazione.
 * Usa upsert: crea il documento se non esiste ancora.
 */
router.put('/', proteggi, soloAdmin, async (req, res) => {
  try {
    const { trailConfig, equipConfig } = req.body;
    const updated = await Configurazione.findOneAndUpdate(
      { chiave: 'app_config' },
      { valore: { trailConfig, equipConfig } },
      { new: true, upsert: true } // Se non esiste, la crea
    );
    res.status(200).json({ successo: true, config: updated.valore });
  } catch (err) { 
    res.status(500).json({ error: 'Errore salvataggio' }); 
  }
});

module.exports = router;