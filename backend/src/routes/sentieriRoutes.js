// src/routes/sentieriRoutes.js

const express = require('express');
const router = express.Router();
const sentieriController = require('../controllers/sentieriController');


// Rotta per forzare l'importazione (da chiamare magari una volta al mese/settimana)
router.post('/importa', sentieriController.importaSentieriDaOverpass);

// Rotta per vedere cosa hai salvato (quella che userà il tuo Frontend per la Mappa)
router.get('/', sentieriController.getSentieriSalvati);

module.exports = router;