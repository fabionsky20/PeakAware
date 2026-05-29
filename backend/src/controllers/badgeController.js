/**
 * @file badgeController.js
 * @description Controller per i badge del modulo educazione.
 * I badge calcolano il progresso dinamicamente a partire dai ProgressiUtente,
 * senza salvare lo stato "ottenuto" nel DB — è sempre derivabile dai dati.
 * Il Cicerone può leggere i badge ottenuti per personalizzare i consigli.
 */

const Badge = require('../models/Badge');
const Quiz = require('../models/Quiz');
const ProgressiUtente = require('../models/ProgressiUtente');

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Calcola la percentuale di avanzamento di un badge per un dato utente.
 *
 * @param {Object} badge - Documento Badge
 * @param {number} puntiUtente - Punti totali dell'utente
 * @param {string[]} completatiIds - IDs quiz completati dall'utente
 * @returns {Promise<number>} Percentuale 0-100
 */
async function calcolaPercentuale(badge, puntiUtente, completatiIds) {
  if (badge.condizione.tipo === 'punti') {
    if (!badge.condizione.sogliaPunti || badge.condizione.sogliaPunti <= 0) return 0;
    return Math.min(100, Math.round((puntiUtente / badge.condizione.sogliaPunti) * 100));
  }

  if (badge.condizione.tipo === 'categoria') {
    const categorie = badge.condizione.categorie;
    if (!categorie || categorie.length === 0) return 0;

    const totale = await Quiz.countDocuments({ categoria: { $in: categorie } });
    if (totale === 0) return 0;

    const completatiInCategoria = await Quiz.countDocuments({
      _id: { $in: completatiIds },
      categoria: { $in: categorie },
    });

    return Math.min(100, Math.round((completatiInCategoria / totale) * 100));
  }

  return 0;
}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * GET /api/educazione/badge
 * Restituisce tutti i badge con la percentuale di avanzamento dell'utente.
 * Usato dalla schermata profilo e dal Cicerone per conoscere gli interessi.
 */
const getTuttiBadge = async (req, res) => {
  try {
    const badges = await Badge.find().sort({ createdAt: 1 });

    const progressi = await ProgressiUtente.findOne({ idUtente: req.utente._id });
    const puntiUtente = progressi?.punti ?? 0;

    // Solo completamenti al 100% contano per i badge (punteggio === punteggioMassimo)
    const completatiPerfetti = (progressi?.quizCompletati ?? []).filter(
      (q) => q.punteggioMassimo > 0 && q.punteggio >= q.punteggioMassimo
    );
    // De-duplica: se un quiz è stato rifatto più volte, conta una volta sola
    const completatiIds = [...new Set(completatiPerfetti.map((q) => q.idQuiz.toString()))];

    const badgeConProgresso = await Promise.all(
      badges.map(async (badge) => {
        const percentuale = await calcolaPercentuale(badge, puntiUtente, completatiIds);
        return {
          _id: badge._id,
          nome: badge.nome,
          descrizione: badge.descrizione,
          icona: badge.icona,
          condizione: badge.condizione,
          percentuale,
          ottenuto: percentuale >= 100,
        };
      })
    );

    res.status(200).json({ successo: true, dati: badgeConProgresso });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nel recupero dei badge',
      errore: error.message,
    });
  }
};

/**
 * POST /api/educazione/badge
 * Crea un nuovo badge. Solo admin.
 */
const creaBadge = async (req, res) => {
  try {
    const { nome, descrizione, icona, condizione } = req.body;
    const badge = await Badge.create({ nome, descrizione, icona, condizione });
    res.status(201).json({ successo: true, messaggio: 'Badge creato', dati: badge });
  } catch (error) {
    res.status(400).json({ successo: false, messaggio: error.message });
  }
};

/**
 * PUT /api/educazione/badge/:id
 * Aggiorna un badge esistente. Solo admin.
 */
const aggiornaBadge = async (req, res) => {
  try {
    const badge = await Badge.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!badge) {
      return res.status(404).json({ successo: false, messaggio: 'Badge non trovato' });
    }
    res.status(200).json({ successo: true, messaggio: 'Badge aggiornato', dati: badge });
  } catch (error) {
    res.status(400).json({ successo: false, messaggio: error.message });
  }
};

/**
 * DELETE /api/educazione/badge/:id
 * Elimina un badge. Solo admin.
 */
const eliminaBadge = async (req, res) => {
  try {
    const badge = await Badge.findByIdAndDelete(req.params.id);
    if (!badge) {
      return res.status(404).json({ successo: false, messaggio: 'Badge non trovato' });
    }
    res.status(200).json({ successo: true, messaggio: 'Badge eliminato' });
  } catch (error) {
    res.status(500).json({ successo: false, messaggio: error.message });
  }
};

module.exports = { getTuttiBadge, creaBadge, aggiornaBadge, eliminaBadge };
