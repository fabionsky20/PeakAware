/**
 * @file authRoutes.js
 * @description Route Express per l'autenticazione.
 * Espone gli endpoint pubblici di registrazione e login.
 * Corrisponde all'interfaccia "Autenticazione e autorizzazione" del Backend API (D2 sezione 1.3).
 */

const express = require('express');
const router = express.Router();
const { registrati, login, getProfilo, cambiaPassword } = require('../controllers/authController');
const { proteggi } = require('../middleware/auth');

/**
 * POST /api/auth/registrati
 * Endpoint pubblico — non richiede token.
 * Body: { email, password, eta }
 */
router.post('/registrati', registrati);

/**
 * POST /api/auth/login
 * Endpoint pubblico — non richiede token.
 * Body: { email, password }
 */
router.post('/login', login);

/**
 * GET /api/auth/profilo
 * Restituisce i dati dell'utente autenticato e i suoi progressi.
 */
router.get('/profilo', proteggi, getProfilo);

/**
 * PUT /api/auth/cambia-password
 * Aggiorna la password dell'utente autenticato.
 * Body: { passwordAttuale, nuovaPassword }
 */
router.put('/cambia-password', proteggi, cambiaPassword);

module.exports = router;