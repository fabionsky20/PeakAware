/**
 * @file ciceroneController.js
 * @description Controller per il Modulo Cicerone.
 * Gestisce le operazioni CRUD sulle notizie e la logica di personalizzazione
 * basata sulle visite dell'utente alle diverse categorie di contenuto.
 * Le immagini caricate tramite EditorJS ma poi rimosse vengono eliminate dal filesystem.
 */

const path = require('path');
const fs = require('fs');
const Notizie = require('../models/Notizie');
const VisiteUtente = require('../models/VisiteUtente');

/**
 * GET /api/cicerone/notizie
 * Restituisce tutte le notizie, ordinate per data di pubblicazione decrescente.
 * Supporta il filtro opzionale per categoria tramite query string.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con array di notizie
 */
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

/**
 * GET /api/cicerone/notizie/:id
 * Restituisce una singola notizia per ID.
 * Se l'utente è autenticato, incrementa il contatore di visite per la categoria
 * della notizia, usato in seguito per personalizzare il feed.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.id - ID MongoDB della notizia
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con la notizia
 */
const getNotiziaById = async (req, res) => {
  try {
    const notizia = await Notizie.findById(req.params.id);
    if (!notizia) {
      return res.status(404).json({ successo: false, messaggio: 'Notizia non trovata' });
    }

    // Traccia la visita per categoria dell'utente loggato
    if (req.utente && notizia.categoria) {
      await VisiteUtente.findOneAndUpdate(
        { utente: req.utente._id, categoria: notizia.categoria },
        { $inc: { visite: 1 } },
        { upsert: true, new: true }  // crea se non esiste
      );
    }

    res.status(200).json({ successo: true, dati: notizia });
  } catch (error) {
    res.status(500).json({ successo: false, messaggio: 'Errore nel recupero', errore: error.message });
  }
};

/**
 * POST /api/cicerone/notizie
 * Crea una nuova notizia. Accessibile solo agli admin.
 * Prima di salvare, rimuove dal filesystem le immagini che l'utente aveva
 * caricato tramite EditorJS ma non ha incluso nel contenuto finale.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {Object} req.body - Dati della notizia, inclusi immaginiCaricate e immaginiUsate
 * @param {Object} req.utente - Utente autenticato (aggiunto dal middleware proteggi)
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con la notizia creata
 */
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

/**
 * DELETE /api/cicerone/notizie/:id
 * Elimina una notizia e cancella dal filesystem tutte le immagini
 * referenziate nei blocchi EditorJS del suo contenuto.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.id - ID MongoDB della notizia da eliminare
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con messaggio di conferma
 */
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

/**
 * PUT /api/cicerone/notizie/:id
 * Aggiorna una notizia esistente. Accessibile solo agli admin.
 * Confronta le immagini vecchie con quelle nuove ed elimina dal filesystem
 * quelle che non compaiono più nel contenuto aggiornato.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.id - ID MongoDB della notizia da aggiornare
 * @param {Object} req.body - Campi aggiornati (titolo, contenuto, categoria, dataPubblicazione)
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con la notizia aggiornata
 */
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

/**
 * POST /api/cicerone/notizie/:id
 * Imposta la dataPubblicazione della notizia all'istante corrente,
 * rendendola visibile nel feed come se fosse pubblicata adesso.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.id - ID MongoDB della notizia da avviare
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con la notizia aggiornata
 */
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

/**
 * GET /api/cicerone/notizie/personalizzate
 * Restituisce le notizie ordinate per affinità con le categorie più visitate
 * dall'utente autenticato. Se l'utente non ha ancora visite, restituisce
 * le notizie più recenti come fallback.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {Object} req.utente - Utente autenticato (aggiunto dal middleware proteggi)
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con le notizie personalizzate
 */
const getNotiziеPersonalizzate = async (req, res) => {
  try {
    // Recupera le categorie più visitate dall'utente, ordinate per visite
    const visite = await VisiteUtente.find({ utente: req.utente._id })
      .sort({ visite: -1 });

    if (visite.length === 0) {
      // Nessuna visita ancora — ritorna le più recenti
      const notizie = await Notizie.find().sort({ dataPubblicazione: -1 });
      return res.status(200).json({ successo: true, dati: notizie });
    }

    const categorieOrdinate = visite.map(v => v.categoria);

    // Recupera tutte le notizie e ordinale per categoria preferita
    const notizie = await Notizie.aggregate([
      {
        $addFields: {
          prioritaCategoria: {
            $indexOfArray: [categorieOrdinate, '$categoria']
          }
        }
      },
      {
        $addFields: {
          prioritaCategoria: {
            $cond: {
              if: { $eq: ['$prioritaCategoria', -1] },
              then: 999,  // categorie non visitate vanno in fondo
              else: '$prioritaCategoria'
            }
          }
        }
      },
      { $sort: { prioritaCategoria: 1, dataPubblicazione: -1 } }
    ]);

    res.status(200).json({ successo: true, dati: notizie });

  } catch (error) {
    res.status(500).json({ successo: false, messaggio: 'Errore nel recupero', errore: error.message });
  }
};

/**
 * GET /api/cicerone/notizie/popolari
 * Restituisce le notizie ordinate per numero totale di visite per categoria,
 * dal gruppo di categorie più visitato al meno visitato.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con le notizie ordinate per popolarità
 */
const getNotiziePopolari = async (req, res) => {
  try {
    const notizie = await Notizie.aggregate([
      {
        $group: {
          _id: '$categoria',
          visiteTotali: { $sum: '$visite' },
          notizie: { $push: '$$ROOT' }
        }
      },
      { $sort: { visiteTotali: -1 } },
      { $unwind: '$notizie' },
      { $replaceRoot: { newRoot: '$notizie' } }
    ]);
    res.status(200).json({ successo: true, dati: notizie });
  } catch (error) {
    res.status(500).json({ successo: false, messaggio: 'Errore nel recupero', errore: error.message });
  }
};

module.exports = { getNotizie, getNotiziaById, creaNotizia, eliminaNotizia, aggiornaNotizia, avviaNotizia, getNotiziеPersonalizzate, getNotiziePopolari};
