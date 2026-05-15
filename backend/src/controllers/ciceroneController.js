const Notizie = require('../models/Notizie');

const getNotizie = async (req, res) => {
  try {
      const filtro = {};
  
      // Aggiunge filtri opzionali se presenti nella query string
      if (req.query.categoria) filtro.categoria = req.query.categoria;
  
      const notizia = await Notizie.find(filtro).sort({ dataPubblicazione: -1 }); // Ordina per data di pubblicazione più recente prima 
      
      res.status(200).json({
        successo: true,
        totale: notizia.length,
        dati: notizia,
      });
    } catch (error) {
      res.status(500).json({
        successo: false,
        messaggio: 'Errore nel recupero delle notizie',
        errore: error.message,
      });
    }
  };

const getNotiziaById = async (req, res) => {
  try {
      const notizie = await Notizie.findById(req.params.id);
  
      if (!notizie) {
        return res.status(404).json({
          successo: false,
          messaggio: 'Notizia non trovata',
        });
      }
  
      res.status(200).json({
        successo: true,
        dati: notizie,
      });
    } catch (error) {
      res.status(500).json({
        successo: false,
        messaggio: 'Errore nel recupero della notizia',
        errore: error.message,
      });
    }
};

const creaNotizia = async (req, res) => {
  try {
    // Aggiunge l'id dell'autore (admin/SAT) preso dal token JWT
    const datiNotizia = {
      ...req.body,
      idAutore: req.utente._id,
    };

    const nuovaNotizia = await Notizie.create(datiNotizia);

    res.status(201).json({
      successo: true,
      messaggio: 'Notizia creata con successo',
      dati: nuovaNotizia,
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nella creazione della notizia',
      errore: error.message,
    });
  }
};

const eliminaNotizia = async (req, res) => {
  const { id } = req.params;
  try {
    const notizia = await Notizie.findByIdAndDelete(id);
    if (!notizia) {
      return res.status(404).json({ message: 'Notizia non trovata' });
    }
    res.json({ message: 'Notizia eliminata con successo' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const aggiornaNotizia = async (req, res) => {
  const { id } = req.params;
  const { titolo, contenuto, autore } = req.body; 
    try { 
    const notizia = await Notizie.findByIdAndUpdate(
      id,
      { titolo, contenuto, autore },
      { new: true }
    );
    if (!notizia) {
      return res.status(404).json({ message: 'Notizia non trovata' });
    }
    res.json(notizia);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getNotizie, getNotiziaById, creaNotizia, eliminaNotizia, aggiornaNotizia };