/**
 * @file authRoutes.js
 * @description Route Express per autenticazione e progressione utente.
 */

const express = require('express');
const router = express.Router();

const {
  registrati, login, getProfilo, cambiaPassword
} = require('../controllers/authController');

const {
  completaSentiero, completaQuiz, getBadge, getProgressione
} = require('../controllers/utenteController');

const { proteggi } = require('../middleware/auth');

// ── Autenticazione (pubbliche) ────────────────────────────────────────────────
router.post('/registrati', registrati);
router.post('/login',      login);

// ── Profilo (protette) ────────────────────────────────────────────────────────
router.get ('/profilo',         proteggi, getProfilo);
router.put ('/cambia-password', proteggi, cambiaPassword);
router.get ('/progressione',    proteggi, getProgressione);

// ── Progressione (protette) ───────────────────────────────────────────────────
router.post('/sentiero', proteggi, completaSentiero); // registra sentiero percorso
router.post('/quiz',     proteggi, completaQuiz);     // registra quiz completato
router.get ('/badge',    proteggi, getBadge);         // lista badge (tutti + sbloccati)

module.exports = router;