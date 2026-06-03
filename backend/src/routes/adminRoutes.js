/**
 * @file adminRoutes.js
 * @description Route Express per la gestione amministrativa degli utenti.
 * Tutte le route richiedono autenticazione (proteggi) e ruolo admin (soloAdmin).
 */

const express = require('express');
const router = express.Router();
const { getUtenti, eliminaUtente, promuoviAdmin } = require('../controllers/adminController');
const { proteggi, soloAdmin } = require('../middleware/auth');

router.get   ('/utenti',              proteggi, soloAdmin, getUtenti);
router.delete('/utenti/:id',          proteggi, soloAdmin, eliminaUtente);
router.put   ('/utenti/:id/promuovi', proteggi, soloAdmin, promuoviAdmin);

module.exports = router;
