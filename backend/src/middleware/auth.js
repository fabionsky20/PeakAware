/**
 * @file auth.js
 * @description Middleware di autenticazione JWT.
 * Protegge gli endpoint che richiedono un utente autenticato.
 * Corrisponde all'interfaccia "Autenticazione e autorizzazione" del Backend API (D2 sezione 1.3).
 */

const jwt = require('jsonwebtoken');
const Utente = require('../models/Utente');

/**
 * Middleware che verifica il token JWT nella richiesta.
 * Il token deve essere inviato nell'header Authorization nel formato:
 * "Bearer <token>"
 *
 * Se il token è valido, aggiunge l'oggetto utente a req.utente
 * e passa al middleware/controller successivo.
 * Se il token manca o non è valido, risponde con errore 401.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {Object} res - Risposta Express
 * @param {Function} next - Funzione per passare al middleware successivo
 */
const proteggi = async (req, res, next) => {
  try {
    // Legge il token dall'header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        successo: false,
        messaggio: 'Accesso negato: token mancante',
      });
    }

    // Estrae il token rimuovendo il prefisso "Bearer "
    const token = authHeader.split(' ')[1];

    // Verifica e decodifica il token usando JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Cerca l'utente nel DB tramite l'id contenuto nel token
    // .select('-password') esclude la password dalla risposta
    const utente = await Utente.findById(decoded.id).select('-password');

    if (!utente) {
      return res.status(401).json({
        successo: false,
        messaggio: 'Accesso negato: utente non trovato',
      });
    }

    // Aggiunge l'utente alla richiesta — disponibile nei controller successivi
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
 * Da usare dopo 'proteggi' sugli endpoint riservati agli operatori SAT.
 * Corrisponde al controllo dei permessi del componente Gestione Contenuti (D2 sezione 1.3).
 *
 * @param {Object} req - Richiesta Express (deve contenere req.utente)
 * @param {Object} res - Risposta Express
 * @param {Function} next - Funzione per passare al middleware successivo
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