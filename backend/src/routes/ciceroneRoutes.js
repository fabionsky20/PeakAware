const express = require('express');
const router = express.Router();
const {
    getNotizie,
    getNotiziaById, 
    creaNotizia, 
    eliminaNotizia, 
    aggiornaNotizia,
    avviaNotizia
} = require('../controllers/ciceroneController');
const { proteggi, soloAdmin } = require('../middleware/auth');

// GET /api/cicerone/notizie - Pubblica, restituisce tutte le notizie
router.get('/notizie', proteggi, getNotizie);

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

module.exports = router;