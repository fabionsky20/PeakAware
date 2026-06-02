const Livello = require('../models/Livello');

const DEFAULT_LIVELLI = [
  { numero: 1, nome: 'Principiante',  puntiNecessari: 0    },
  { numero: 2, nome: 'Base',          puntiNecessari: 100  },
  { numero: 3, nome: 'Esperto base',  puntiNecessari: 300  },
  { numero: 4, nome: 'Esperto',       puntiNecessari: 600  },
  { numero: 5, nome: 'Maestro',       puntiNecessari: 1000 },
];

/**
 * Inizializza i livelli di default se la collection è vuota.
 * Chiamato al boot del server.
 */
const seedLivelli = async () => {
  const count = await Livello.countDocuments();
  if (count === 0) {
    await Livello.insertMany(DEFAULT_LIVELLI);
    console.log('Livelli di default creati.');
  }
};

/** GET /api/livelli — tutti i livelli ordinati per puntiNecessari */
const getLivelli = async (req, res) => {
  try {
    const livelli = await Livello.find().sort({ puntiNecessari: 1 });
    res.json({ successo: true, dati: livelli });
  } catch (e) {
    res.status(500).json({ successo: false, messaggio: 'Errore nel recupero dei livelli' });
  }
};

/** POST /api/livelli — crea un nuovo livello (solo admin) */
const creaLivello = async (req, res) => {
  try {
    const { nome, puntiNecessari } = req.body;
    if (!nome || puntiNecessari == null) {
      return res.status(400).json({ successo: false, messaggio: 'nome e puntiNecessari sono obbligatori' });
    }
    const ultimo = await Livello.findOne().sort({ numero: -1 });
    const numero = (ultimo?.numero ?? 0) + 1;
    const livello = await Livello.create({ numero, nome: nome.trim(), puntiNecessari: Number(puntiNecessari) });
    res.status(201).json({ successo: true, dati: livello });
  } catch (e) {
    res.status(500).json({ successo: false, messaggio: 'Errore nella creazione del livello', errore: e.message });
  }
};

/** PUT /api/livelli/:id — aggiorna nome e/o puntiNecessari (solo admin) */
const aggiornaLivello = async (req, res) => {
  try {
    const { nome, puntiNecessari } = req.body;
    const livello = await Livello.findById(req.params.id);
    if (!livello) return res.status(404).json({ successo: false, messaggio: 'Livello non trovato' });

    if (nome != null)           livello.nome = nome.trim();
    // Il livello 1 è sempre a 0 punti
    if (puntiNecessari != null && livello.numero !== 1) {
      livello.puntiNecessari = Number(puntiNecessari);
    }
    await livello.save();
    res.json({ successo: true, dati: livello });
  } catch (e) {
    res.status(500).json({ successo: false, messaggio: "Errore nell'aggiornamento del livello", errore: e.message });
  }
};

/** DELETE /api/livelli/:id — elimina il livello (solo admin, non il primo) */
const eliminaLivello = async (req, res) => {
  try {
    const livello = await Livello.findById(req.params.id);
    if (!livello) return res.status(404).json({ successo: false, messaggio: 'Livello non trovato' });
    if (livello.numero === 1) {
      return res.status(400).json({ successo: false, messaggio: 'Il livello 1 non può essere eliminato' });
    }
    await Livello.findByIdAndDelete(req.params.id);

    // Rinumera i livelli rimanenti
    const rimanenti = await Livello.find().sort({ puntiNecessari: 1 });
    for (let i = 0; i < rimanenti.length; i++) {
      await Livello.findByIdAndUpdate(rimanenti[i]._id, { numero: i + 1 });
    }

    res.json({ successo: true, messaggio: 'Livello eliminato' });
  } catch (e) {
    res.status(500).json({ successo: false, messaggio: "Errore nell'eliminazione del livello", errore: e.message });
  }
};

module.exports = { getLivelli, creaLivello, aggiornaLivello, eliminaLivello, seedLivelli };
