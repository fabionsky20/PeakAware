const express = require('express');
const router = express.Router();
const ciceroneController = require('../controllers/ciceroneController');
const { proteggi, soloAdmin } = require('../middleware/auth');

// GET /api/cicerone/notizie - Pubblica, restituisce tutte le notizie
router.get('/notizie', proteggi, ciceroneController.getNotizie);

// GET /api/cicerone/notizie/:id - Pubblica, restituisce una notizia specifica
router.get('/notizie/:id', proteggi, ciceroneController.getNotiziaById);

// POST /api/cicerone/notizie - Riservato agli admin, crea una nuova notizia
router.post('/notizie', proteggi, soloAdmin, ciceroneController.creaNotizia);

// DELETE /api/cicerone/notizie/:id - Riservato agli admin, elimina una notizia
router.delete('/notizie/:id', proteggi, soloAdmin, ciceroneController.eliminaNotizia);

// PUT /api/cicerone/notizie/:id - Riservato agli admin, aggiorna una notizia
router.put('/notizie/:id', proteggi, soloAdmin, ciceroneController.aggiornaNotizia);