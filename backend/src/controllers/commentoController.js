const Commento = require('../models/Commento');

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