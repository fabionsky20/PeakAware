/**
 * @file educazioneRoutes.js
 * @description Route Express per il Modulo Educazione.
 * Espone gli endpoint per quiz e video.
 * Gli endpoint di lettura sono pubblici.
 * Gli endpoint di scrittura richiedono autenticazione admin.
 * Corrisponde all'interfaccia API REST del Modulo Educazione (D2 sezione 1.3).
 */

const express = require('express');
const router = express.Router();
const {
  getTuttiIQuiz,
  getQuizById,
  creaQuiz,
  aggiornaQuiz,
  eliminaQuiz,
  getTuttiIVideo,
  creaVideo,
} = require('../controllers/educazioneController');
const { proteggi, soloAdmin } = require('../middleware/auth');

// ========================
// ROUTES QUIZ
// ========================

/**
 * GET /api/educazione/quiz
 * Pubblica — restituisce tutti i quiz (con filtri opzionali).
 */
router.get('/quiz', getTuttiIQuiz);

/**
 * GET /api/educazione/quiz/:id
 * Pubblica — restituisce un quiz completo di domande e risposte.
 */
router.get('/quiz/:id', getQuizById);

/**
 * POST /api/educazione/quiz
 * Protetta — solo admin/SAT possono creare quiz.
 * proteggi: verifica il token JWT
 * soloAdmin: verifica che il ruolo sia 'admin'
 */
router.post('/quiz', proteggi, soloAdmin, creaQuiz);

/**
 * PUT /api/educazione/quiz/:id
 * Protetta — solo admin/SAT possono modificare quiz.
 */
router.put('/quiz/:id', proteggi, soloAdmin, aggiornaQuiz);

/**
 * DELETE /api/educazione/quiz/:id
 * Protetta — solo admin/SAT possono eliminare quiz.
 */
router.delete('/quiz/:id', proteggi, soloAdmin, eliminaQuiz);

// ========================
// ROUTES VIDEO
// ========================

/**
 * GET /api/educazione/video
 * Pubblica — restituisce tutti i video (con filtri opzionali).
 */
router.get('/video', getTuttiIVideo);

/**
 * POST /api/educazione/video
 * Protetta — solo admin/SAT possono aggiungere video.
 */
router.post('/video', proteggi, soloAdmin, creaVideo);

module.exports = router;