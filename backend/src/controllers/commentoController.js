/**
 * @file commentoController.js
 * @description Controller per la gestione dei commenti alle notizie del Cicerone.
 * Ogni commento è associato a una notizia e a un utente autenticato.
 * La cancellazione è permessa all'autore del commento o agli admin.
 */

const Commento = require('../models/Commento');

/**
 * POST /api/cicerone/notizie/:idNotizia/commenti
 * Crea un nuovo commento su una notizia. Richiede autenticazione.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.idNotizia - ID MongoDB della notizia
 * @param {string} req.body.testo - Testo del commento
 * @param {Object} req.utente - Utente autenticato (aggiunto dal middleware proteggi)
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con il commento creato
 */
const creaCommento = async (req, res) => {
  try {

    const { testo } = req.body;
    const { idNotizia } = req.params;

    const commento = await Commento.create({
      testo,
      autore: req.utente._id,
      notizia: idNotizia
    });

    res.status(201).json(commento);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/**
 * GET /api/cicerone/notizie/:idNotizia/commenti
 * Restituisce tutti i commenti di una notizia, con il campo autore
 * popolato (solo username), ordinati per data di creazione decrescente.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.idNotizia - ID MongoDB della notizia
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con array di commenti
 */
const getCommentiNotizia = async (req, res) => {
  try {

    const { idNotizia } = req.params;

    const commenti = await Commento.find({
      notizia: idNotizia
    })
    .populate('autore', 'username')
    .sort({ dataCreazione: -1 });

    res.json(commenti);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

/**
 * DELETE /api/cicerone/notizie/:idNotizia/commenti/:commentoId
 * Elimina un commento. Consentito solo all'autore del commento o a un admin.
 * Restituisce 403 se l'utente non ha i permessi necessari.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.commentoId - ID MongoDB del commento
 * @param {Object} req.utente - Utente autenticato (aggiunto dal middleware proteggi)
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con messaggio di conferma
 */
const eliminaCommento = async (req, res) => {
  try {
    const commento = await Commento.findById(req.params.commentoId);
    if (!commento) {
      return res.status(404).json({ successo: false, messaggio: 'Commento non trovato' });
    }

    const isAutore = commento.autore.toString() === req.utente._id.toString();
    const isAdmin  = req.utente.ruolo === 'admin';

    if (!isAutore && !isAdmin) {
      return res.status(403).json({ successo: false, messaggio: 'Non autorizzato' });
    }

    await Commento.findByIdAndDelete(req.params.commentoId);
    res.json({ successo: true, messaggio: 'Commento eliminato' });

  } catch (error) {
    res.status(500).json({ successo: false, messaggio: "Errore nell'eliminazione", errore: error.message });
  }
};

module.exports = {
  creaCommento,
  getCommentiNotizia,
  eliminaCommento
};