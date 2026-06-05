/**
 * @file livelloRoutes.js
 * @description Route Express per la gestione dei livelli di esperienza.
 * La lettura è accessibile a tutti gli utenti autenticati.
 * Le operazioni di scrittura sono riservate agli admin.
 */

const express = require('express');
const router = express.Router();
const { getLivelli, creaLivello, aggiornaLivello, eliminaLivello } = require('../controllers/livelloController');
const { proteggi, soloAdmin } = require('../middleware/auth');

/** GET /api/livelli — tutti i livelli ordinati per puntiNecessari (accessibile a utenti autenticati) */
router.get('/',       proteggi,            getLivelli);

/** POST /api/livelli — crea un nuovo livello (solo admin) */
router.post('/',      proteggi, soloAdmin, creaLivello);

/** PUT /api/livelli/:id — aggiorna nome e/o puntiNecessari (solo admin) */
router.put('/:id',    proteggi, soloAdmin, aggiornaLivello);

/** DELETE /api/livelli/:id — elimina il livello e rinumera i rimanenti (solo admin) */
router.delete('/:id', proteggi, soloAdmin, eliminaLivello);

module.exports = router;
