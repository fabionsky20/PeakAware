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

// GET /api/cicerone/notizie - Pubblica, restituisce tutte le notizie
router.get('/notizie', proteggi, getNotizie);

// GET /api/cicerone/notizie/personalizzate - Pubblica, restituisce notizie personalizzate per l'utente
router.get('/notizie/personalizzate', proteggi, getNotiziеPersonalizzate);

// GET /api/cicerone/notizie/popolari - Pubblica, restituisce le notizie più popolari
router.get('/notizie/popolari', proteggi, getNotiziePopolari);

// GET /api/cicerone/notizie/:id - Pubblica, restituisce una notizia specifica
router.get('/notizie/:id', proteggi, getNotiziaById);

// POST /api/cicerone/notizie - Riservato agli admin, crea una nuova notizia
router.post('/notizie', proteggi, soloAdmin, creaNotizia);

// DELETE /api/cicerone/notizie/:id - Riservato agli admin, elimina una notizia
router.delete('/notizie/:id', proteggi, soloAdmin, eliminaNotizia);

// PUT /api/cicerone/notizie/:id - Riservato agli admin, aggiorna una notizia
router.put('/notizie/:id', proteggi, soloAdmin, aggiornaNotizia);

// POST /api/cicerone/notizie/:id Avvia una notizia
router.post('/notizie/:id', proteggi, avviaNotizia);

//GET /api/cicerone/notizie/:idNotizia/commenti - Pubblica, restituisce i commenti di una notizia
router.get('/notizie/:idNotizia/commenti', proteggi, getCommentiNotizia);

// POST /api/cicerone/notizie/:idNotizia/commenti - Riservato agli utenti autenticati, crea un commento su una notizia
router.post('/notizie/:idNotizia/commenti', proteggi, creaCommento);

// DELETE /api/cicerone/notizie/:idNotizia/commenti/:commentoId - Riservato agli utenti autenticati, elimina un commento
router.delete('/notizie/:idNotizia/commenti/:commentoId', proteggi, eliminaCommento);

module.exports = router;