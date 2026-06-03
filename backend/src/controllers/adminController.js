/**
 * @file adminController.js
 * @description Controller per le operazioni amministrative sugli utenti.
 * Tutte le route che usano questo controller devono essere protette
 * da `proteggi` + `soloAdmin`.
 */

const Utente = require('../models/Utente');
const ProgressiUtente = require('../models/ProgressiUtente');

/**
 * GET /api/admin/utenti?q=<termine>
 * Restituisce la lista di tutti gli utenti registrati.
 * Se il parametro `q` è presente, filtra per username o email (case-insensitive).
 */
const getUtenti = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const filtro = q
      ? { $or: [
          { username: { $regex: q, $options: 'i' } },
          { email:    { $regex: q, $options: 'i' } },
        ] }
      : {};

    const utenti = await Utente.find(filtro)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ successo: true, dati: utenti });
  } catch (error) {
    res.status(500).json({ successo: false, messaggio: 'Errore nel recupero utenti', errore: error.message });
  }
};

/**
 * DELETE /api/admin/utenti/:id
 * Elimina l'utente e i relativi progressi dal database.
 * Un admin non può eliminare se stesso.
 */
const eliminaUtente = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.utente._id.toString()) {
      return res.status(400).json({ successo: false, messaggio: 'Non puoi eliminare il tuo stesso account.' });
    }

    const utente = await Utente.findByIdAndDelete(id);
    if (!utente) {
      return res.status(404).json({ successo: false, messaggio: 'Utente non trovato.' });
    }

    await ProgressiUtente.findOneAndDelete({ idUtente: id });

    res.json({ successo: true, messaggio: `Utente "${utente.username}" eliminato.` });
  } catch (error) {
    res.status(500).json({ successo: false, messaggio: 'Errore durante eliminazione', errore: error.message });
  }
};

/**
 * PUT /api/admin/utenti/:id/promuovi
 * Promuove l'utente specificato al ruolo 'admin'.
 */
const promuoviAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const utente = await Utente.findByIdAndUpdate(
      id,
      { ruolo: 'admin' },
      { new: true }
    ).select('-password');

    if (!utente) {
      return res.status(404).json({ successo: false, messaggio: 'Utente non trovato.' });
    }

    res.json({ successo: true, messaggio: `${utente.username} è ora admin.`, dati: utente });
  } catch (error) {
    res.status(500).json({ successo: false, messaggio: 'Errore durante promozione', errore: error.message });
  }
};

module.exports = { getUtenti, eliminaUtente, promuoviAdmin };
