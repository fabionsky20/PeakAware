/**
 * @file ciceroneRoutes.js
 * @description Route Express per il Modulo Cicerone.
 * Espone gli endpoint per la gestione delle notizie e dei commenti.
 * Tutte le route richiedono autenticazione utente (proteggi).
 * Le operazioni di scrittura sulle notizie richiedono anche ruolo admin (soloAdmin).
 * I commenti possono essere creati da qualsiasi utente autenticato e cancellati
 * solo dall'autore o da un admin (verifica nel controller).
 */

const express = require('express');
const router = express.Router();
const {
    getNotizie,
    getNotiziaById, 
    creaNotizia, 
    eliminaNotizia, 
    aggiornaNotizia,
    avviaNotizia,
    getNotiziеPersonalizzate,
    getNotiziePopolari
} = require('../controllers/ciceroneController');
const {
    getCommentiNotizia,
    creaCommento,
    eliminaCommento
} = require('../controllers/commentoController');
const { proteggi, soloAdmin } = require('../middleware/auth');

// ========================
// ROUTES NOTIZIE
// ========================

/**
 * GET /api/cicerone/notizie
 * Protetta — restituisce tutte le notizie (opzionale: ?categoria=X).
 */
router.get('/notizie', proteggi, getNotizie);

/**
 * GET /api/cicerone/notizie/personalizzate
 * Protetta — notizie ordinate per affinità con le categorie più visitate dall'utente.
 * Deve precedere /notizie/:id per evitare che "personalizzate" venga interpretato come ID.
 */
router.get('/notizie/personalizzate', proteggi, getNotiziеPersonalizzate);

/**
 * GET /api/cicerone/notizie/popolari
 * Protetta — notizie ordinate per numero di visite totali per categoria.
 * Deve precedere /notizie/:id per lo stesso motivo di /personalizzate.
 */
router.get('/notizie/popolari', proteggi, getNotiziePopolari);

/**
 * GET /api/cicerone/notizie/:id
 * Protetta — restituisce una notizia specifica e registra la visita per categoria.
 */
router.get('/notizie/:id', proteggi, getNotiziaById);

/**
 * POST /api/cicerone/notizie
 * Protetta — solo admin possono creare notizie.
 */
router.post('/notizie', proteggi, soloAdmin, creaNotizia);

/**
 * PUT /api/cicerone/notizie/:id
 * Protetta — solo admin possono modificare notizie.
 */
router.put('/notizie/:id', proteggi, soloAdmin, aggiornaNotizia);

/**
 * DELETE /api/cicerone/notizie/:id
 * Protetta — solo admin possono eliminare notizie (e le immagini collegate).
 */
router.delete('/notizie/:id', proteggi, soloAdmin, eliminaNotizia);

/**
 * POST /api/cicerone/notizie/:id (senza body aggiuntivo)
 * Protetta — imposta la dataPubblicazione della notizia all'istante corrente.
 */
router.post('/notizie/:id', proteggi, avviaNotizia);

// ========================
// ROUTES COMMENTI
// ========================

/**
 * GET /api/cicerone/notizie/:idNotizia/commenti
 * Protetta — restituisce i commenti di una notizia con autore popolato.
 */
router.get('/notizie/:idNotizia/commenti', proteggi, getCommentiNotizia);

/**
 * POST /api/cicerone/notizie/:idNotizia/commenti
 * Protetta — qualsiasi utente autenticato può commentare.
 */
router.post('/notizie/:idNotizia/commenti', proteggi, creaCommento);

/**
 * DELETE /api/cicerone/notizie/:idNotizia/commenti/:commentoId
 * Protetta — consentito solo all'autore del commento o a un admin.
 */
router.delete('/notizie/:idNotizia/commenti/:commentoId', proteggi, eliminaCommento);

module.exports = router;