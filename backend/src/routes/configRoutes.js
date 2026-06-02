const express = require('express');
const router = express.Router();
const Configurazione = require('../models/Configurazione');
const { proteggi, soloAdmin } = require('../middleware/auth'); // Assicurati che il percorso sia corretto

// GET: Legge la configurazione globale
router.get('/', async (req, res) => {
  try {
    const conf = await Configurazione.findOne({ chiave: 'app_config' });
    res.status(200).json(conf ? conf.valore : {});
  } catch (err) { 
    res.status(500).json({ error: 'Errore DB' }); 
  }
});

// PUT: Salva la configurazione (Solo Admin)
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