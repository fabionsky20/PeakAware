/**
 * @file educazioneRoutes.js
 * @description Route Express per il Modulo Educazione.
 * Espone gli endpoint per quiz, video, sessioni quiz e progressi utente.
 * Gli endpoint di lettura dei contenuti sono pubblici.
 * Gli endpoint di sessione e progressi richiedono autenticazione utente.
 * Gli endpoint di scrittura sui contenuti richiedono autenticazione admin.
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
  getVideoById,
  creaVideo,
  aggiornaVideo,
  eliminaVideo,
} = require('../controllers/educazioneController');
const {
  avviaSessione,
  rispondi,
  terminaSessione,
  getProgressi,
} = require('../controllers/sessioneController');
const {
  getTuttiBadge,
  creaBadge,
  aggiornaBadge,
  eliminaBadge,
} = require('../controllers/badgeController');
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
 * GET /api/educazione/video/:id
 * Pubblica — restituisce un singolo video.
 */
router.get('/video/:id', getVideoById);

/**
 * POST /api/educazione/video
 * Protetta — solo admin/SAT possono aggiungere video.
 */
router.post('/video', proteggi, soloAdmin, creaVideo);

/**
 * PUT /api/educazione/video/:id
 * Protetta — solo admin/SAT possono modificare video.
 */
router.put('/video/:id', proteggi, soloAdmin, aggiornaVideo);

/**
 * DELETE /api/educazione/video/:id
 * Protetta — solo admin/SAT possono eliminare video.
 */
router.delete('/video/:id', proteggi, soloAdmin, eliminaVideo);

// ========================
// ROUTES SESSIONE QUIZ
// ========================

/**
 * POST /api/educazione/sessione/avvia/:quizId
 * Protetta — avvia una nuova sessione quiz per l'utente autenticato.
 */
router.post('/sessione/avvia/:quizId', proteggi, avviaSessione);

/**
 * POST /api/educazione/sessione/:id/rispondi
 * Protetta — registra la risposta a una domanda e restituisce feedback immediato.
 */
router.post('/sessione/:id/rispondi', proteggi, rispondi);

/**
 * POST /api/educazione/sessione/:id/termina
 * Protetta — chiude la sessione, calcola il punteggio e aggiorna i progressi.
 */
router.post('/sessione/:id/termina', proteggi, terminaSessione);

// ========================
// ROUTES PROGRESSI
// ========================

/**
 * GET /api/educazione/progressi
 * Protetta — restituisce punti, livello e quiz completati dell'utente autenticato.
 */
router.get('/progressi', proteggi, getProgressi);

// ========================
// ROUTES BADGE
// ========================

/**
 * GET /api/educazione/badge
 * Protetta — restituisce tutti i badge con la percentuale di avanzamento dell'utente.
 * Usato anche dal Cicerone per conoscere gli interessi dell'utente.
 */
router.get('/badge', proteggi, getTuttiBadge);

/**
 * POST /api/educazione/badge
 * Protetta — solo admin possono creare badge.
 */
router.post('/badge', proteggi, soloAdmin, creaBadge);

/**
 * PUT /api/educazione/badge/:id
 * Protetta — solo admin possono modificare badge.
 */
router.put('/badge/:id', proteggi, soloAdmin, aggiornaBadge);

/**
 * DELETE /api/educazione/badge/:id
 * Protetta — solo admin possono eliminare badge.
 */
router.delete('/badge/:id', proteggi, soloAdmin, eliminaBadge);

module.exports = router;