/**
 * @file authRoutes.js
 * @description Route Express per l'autenticazione.
 * Espone gli endpoint pubblici di registrazione e login.
 * Corrisponde all'interfaccia "Autenticazione e autorizzazione" del Backend API (D2 sezione 1.3).
 */

const express = require('express');
const router = express.Router();
const { registrati, login } = require('../controllers/authController');

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

module.exports = router;