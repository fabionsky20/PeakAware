/**
 * @file auth.js
 * @description Middleware di autenticazione JWT.
 */

const jwt = require('jsonwebtoken');
const Utente = require('../models/Utente');

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:            # Nome identificativo dello schema
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT    # Specifica che il token è un JSON Web Token
 *       description: Inserisci il token JWT nel formato "Bearer <token>" per accedere alle rotte protette.
 */

/**
 * Middleware che verifica il token JWT nella richiesta.
 * Il token deve essere inviato nell'header Authorization nel formato "Bearer <token>".
 */
const proteggi = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        successo: false,
        messaggio: 'Accesso negato: token mancante',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Esclude la password dalla richiesta per sicurezza
    const utente = await Utente.findById(decoded.id).select('-password');

    if (!utente) {
      return res.status(401).json({
        successo: false,
        messaggio: 'Accesso negato: utente non trovato',
      });
    }

    req.utente = utente;
    next();
  } catch (error) {
    res.status(401).json({
      successo: false,
      messaggio: 'Accesso negato: token non valido',
      errore: error.message,
    });
  }
};

/**
 * Middleware che verifica se l'utente autenticato ha ruolo 'admin'.
 * Da usare dopo 'proteggi' per le operazioni riservate (es. operatori SAT).
 */
const soloAdmin = (req, res, next) => {
  if (req.utente && req.utente.ruolo === 'admin') {
    next();
  } else {
    res.status(403).json({
      successo: false,
      messaggio: 'Accesso negato: permessi insufficienti',
    });
  }
};

module.exports = { proteggi, soloAdmin };