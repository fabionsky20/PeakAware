const Notizie = require('../models/Notizie');

const getNotizie = async (req, res) => {
  try {
    const notizie = await Notizie.find().sort({ dataPubblicazione: -1 });
    res.json(notizie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNotiziaById = async (req, res) => {
  const { id } = req.params;
    try {
    const notizia = await Notizie.findById(id);
    if (!notizia) {
      return res.status(404).json({ message: 'Notizia non trovata' });
    }
    res.json(notizia);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const creaNotizia = async (req, res) => {
  const { titolo, contenuto, autore } = req.body;
  try {
    const notizia = new Notizie({ titolo, contenuto, autore });
    await notizia.save();
    res.status(201).json(notizia);
  } catch (error) {
    res.status(400).json({ message: error.message });
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

module.exports = { getNotizie, creaNotizia, eliminaNotizia, aggiornaNotizia };