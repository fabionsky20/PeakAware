/**
 * @file sentieriRoutes.js
 * @description Route Express per il Modulo Sentieri.
 * Espone gli endpoint per i sentieri, verranno usati da Leafmap per la visualizzazione.
 * Gli endpoint di lettura sono pubblici.
 * Gli endpoint di scrittura richiedono autenticazione admin (per esempio toggle Visibilità di un sentiero).
 */

const express = require('express');
const router = express.Router();
const sentieriController = require('../controllers/sentieriController');

// Middleware di autenticazione per le rotte protette (toggle visibilità)
const {proteggi, soloAdmin} = require('../middleware/auth');

// Rotta per forzare l'importazione (da chiamare magari una volta al mese/settimana)
router.post('/importa', sentieriController.importaSentieriDaOverpass);

// Rotte per visualizzazione e gestione dei sentieri
router.get('/', sentieriController.getAllSentieri);

router.get('/:id', sentieriController.getSentieroById);

//controlla che l'utente sia autenticato e admin prima di permettere di cambiare la visibilità del sentiero
router.patch('/:id/toggle-visibilita',proteggi, soloAdmin, sentieriController.toggleVisibilitaSentiero);


module.exports = router;