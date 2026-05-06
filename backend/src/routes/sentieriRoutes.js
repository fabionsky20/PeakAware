/**
 * @file sentieriRoutes.js
 * @description Route Express per il Modulo Sentieri.
 */

const express = require('express');
const router = express.Router();
const sentieriController = require('../controllers/sentieriController');

// Middleware di autenticazione per le rotte protette
const {proteggi, soloAdmin} = require('../middleware/auth');

/**
 * @openapi
 * tags:
 *   name: Sentieri
 *   description: Gestione e visualizzazione dei sentieri escursionistici
 */

// Rotta per l'importazione (Protetta: richiede Token Admin)
// Nota: aggiungiamo 'security' nel blocco @openapi del controller per questa rotta
router.post('/importa', proteggi, soloAdmin, sentieriController.importaSentieriDaOverpass);

// Rotte pubbliche per la visualizzazione[cite: 18]
router.get('/', sentieriController.getAllSentieri);
router.get('/:id', sentieriController.getSentieroById);

// Rotta per cambiare visibilità (Protetta: richiede Token Admin)[cite: 18]
router.patch('/:id/toggleVisibilita', proteggi, soloAdmin, sentieriController.toggleVisibilita);

module.exports = router;