const path = require('path');
const fs = require('fs');
const Notizie = require('../models/Notizie');

const getNotizie = async (req, res) => {
  try {
    const filtro = {};
    if (req.query.categoria) filtro.categoria = req.query.categoria;
    const notizia = await Notizie.find(filtro).sort({ dataPubblicazione: -1 });
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
    const { immaginiCaricate, immaginiUsate, ...datiPuliti } = req.body;

    // Elimina immagini caricate ma non usate
    if (immaginiCaricate?.length) {
      for (const url of immaginiCaricate) {
        if (!immaginiUsate?.includes(url)) {
          const filename = url.split('/uploads/')[1];
          if (filename) {
            const filePath = path.join(__dirname, '..', '..', 'uploads', filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log('🗑️ Immagine orfana rimossa:', filename);
            }
          }
        }
      }
    }

    const nuovaNotizia = await Notizie.create({
      ...datiPuliti,
      idAutore: req.utente._id,
    });

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
  try {
    const notizia = await Notizie.findById(req.params.id);
    if (!notizia) {
      return res.status(404).json({
        successo: false,
        messaggio: 'Notizia non trovata',
      });
    }

    if (notizia.contenuto && notizia.contenuto.blocks) {
      for (const block of notizia.contenuto.blocks) {
        if (block.type === 'image' && block.data?.file?.url) {
          const filename = block.data.file.url.split('/uploads/')[1];
          if (filename) {
            const filePath = path.join(__dirname, '..', '..', 'uploads', filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log('Immagine eliminata:', filename);
            }
          }
        }
      }
    }

    await Notizie.findByIdAndDelete(req.params.id);
    res.json({
      successo: true,
      messaggio: 'Notizia eliminata con successo',
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: "Errore durante l'eliminazione della notizia",
      errore: error.message,
    });
  }
};

const aggiornaNotizia = async (req, res) => {
  const { id } = req.params;
  const { titolo, contenuto, categoria, dataPubblicazione } = req.body;
  try {
    // Recupera la notizia PRIMA dell'aggiornamento
    const notiziaVecchia = await Notizie.findById(id);
    if (!notiziaVecchia) {
      return res.status(404).json({ successo: false, messaggio: 'Notizia non trovata' });
    }

    // Estrai URL immagini vecchie
    const immaginiVecchie = (notiziaVecchia.contenuto?.blocks ?? [])
      .filter(b => b.type === 'image' && b.data?.file?.url)
      .map(b => b.data.file.url);

    // Estrai URL immagini nuove
    const immaginiNuove = (contenuto?.blocks ?? [])
      .filter(b => b.type === 'image' && b.data?.file?.url)
      .map(b => b.data.file.url);

    // Elimina le immagini che non sono più presenti
    for (const url of immaginiVecchie) {
      if (!immaginiNuove.includes(url)) {
        const filename = url.split('/uploads/')[1];
        if (filename) {
          const filePath = path.join(__dirname, '..', '..', 'uploads', filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🗑️ Immagine rimossa:', filename);
          }
        }
      }
    }

    // Aggiorna la notizia
    const notizia = await Notizie.findByIdAndUpdate(
      id,
      { titolo, contenuto, categoria, dataPubblicazione },
      { new: true }
    );

    res.json({ successo: true, dati: notizia });

  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: "Errore durante l'aggiornamento della notizia",
      errore: error.message,
    });
  }
};

const avviaNotizia = async (req, res) => {
  try {
    const notizia = await Notizie.findById(req.params.id);
    if (!notizia) {
      return res.status(404).json({
        successo: false,
        messaggio: 'Notizia non trovata',
      });
    }
    notizia.dataPubblicazione = new Date();
    await notizia.save();
    res.json({
      successo: true,
      messaggio: 'Notizia avviata con successo',
      dati: notizia,
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: "Errore durante l'avvio della notizia",
      errore: error.message,
    });
  }
};

module.exports = { getNotizie, getNotiziaById, creaNotizia, eliminaNotizia, aggiornaNotizia, avviaNotizia };
