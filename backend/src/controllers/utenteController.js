/**
 * @file utenteController.js
 * @description Controller per le azioni sul profilo utente:
 * registrazione sentieri percorsi, completamento quiz, badge e progressione.
 * 
 * authController.js gestisce: registrati, login, getProfilo, cambiaPassword
 * utenteController.js gestisce: tutto ciò che riguarda la progressione
 */

const Utente = require('../models/Utente');
const { verificaBadge, getAllBadge } = require('../services/badgeService');

// ─── POST /api/utenti/sentiero ───────────────────────────────────────────────
/**
 * Registra un sentiero come percorso dall'utente autenticato.
 * Aggiorna km totali, dislivello, livello pratico e verifica nuovi badge.
 * 
 * Body: { osm_id, nome, km, dislivello }
 */
exports.completaSentiero = async (req, res) => {
  try {
    const utente = await Utente.findById(req.utente.id);
    if (!utente) return res.status(404).json({ message: 'Utente non trovato' });

    const { osm_id, nome, km, dislivello } = req.body;
    if (!osm_id) return res.status(400).json({ message: 'osm_id obbligatorio' });

    // Controlla se il sentiero è già stato registrato oggi (evita duplicati accidentali)
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const giaRegistrato = utente.esperienza.sentieri.some(
      s => s.osm_id === osm_id && new Date(s.percorsoIl) >= oggi
    );
    if (giaRegistrato) {
      return res.status(409).json({ message: 'Sentiero già registrato oggi' });
    }

    await utente.aggiungiSentiero({ osm_id, nome, km: km ?? 0, dislivello: dislivello ?? 0 });

    const nuoviBadge = verificaBadge(utente);
    if (nuoviBadge.length > 0) await utente.save();

    res.status(200).json({
      message: 'Sentiero registrato con successo',
      esperienza: {
        livelloPratico:     utente.esperienza.livelloPratico,
        livelloComplessivo: utente.esperienza.livelloComplessivo,
        kmTotali:           utente.esperienza.kmTotali,
        dislivelloTotale:   utente.esperienza.dislivelloTotale,
      },
      nuoviBadge,
    });
  } catch (error) {
    console.error('Errore completaSentiero:', error.message);
    res.status(500).json({ error: 'Errore nella registrazione del sentiero' });
  }
};

// ─── POST /api/utenti/quiz ───────────────────────────────────────────────────
/**
 * Registra il completamento di un quiz.
 * Aggiorna puntiQuiz, livello teorico e verifica nuovi badge.
 * 
 * Body: { quizId, punteggio }  (punteggio: 0-100)
 */
exports.completaQuiz = async (req, res) => {
  try {
    const utente = await Utente.findById(req.utente.id);
    if (!utente) return res.status(404).json({ message: 'Utente non trovato' });

    const { quizId, punteggio } = req.body;
    if (!quizId || punteggio == null) {
      return res.status(400).json({ message: 'quizId e punteggio obbligatori' });
    }
    if (punteggio < 0 || punteggio > 100) {
      return res.status(400).json({ message: 'Punteggio deve essere tra 0 e 100' });
    }

    // Permette di rifare un quiz ma conta solo il tentativo corrente
    await utente.aggiungiQuiz({ quizId, punteggio });

    const nuoviBadge = verificaBadge(utente);
    if (nuoviBadge.length > 0) await utente.save();

    res.status(200).json({
      message: 'Quiz registrato con successo',
      esperienza: {
        livelloTeorico:     utente.esperienza.livelloTeorico,
        livelloComplessivo: utente.esperienza.livelloComplessivo,
        puntiQuiz:          utente.esperienza.puntiQuiz,
      },
      nuoviBadge,
    });
  } catch (error) {
    console.error('Errore completaQuiz:', error.message);
    res.status(500).json({ error: 'Errore nella registrazione del quiz' });
  }
};

// ─── GET /api/utenti/badge ───────────────────────────────────────────────────
/**
 * Restituisce tutti i badge del sistema con flag "sbloccato" per l'utente.
 * Utile per la pagina profilo: mostra badge ottenuti e quelli ancora da raggiungere.
 */
exports.getBadge = async (req, res) => {
  try {
    const utente = await Utente.findById(req.utente.id).select('badges');
    if (!utente) return res.status(404).json({ message: 'Utente non trovato' });

    const sbloccatiMap = new Map(
      utente.badges.map(b => [b.id, b.sbloccatoIl])
    );

    const tutti = getAllBadge().map(badge => ({
      ...badge,
      sbloccato:   sbloccatiMap.has(badge.id),
      sbloccatoIl: sbloccatiMap.get(badge.id) ?? null,
    }));

    res.status(200).json(tutti);
  } catch (error) {
    console.error('Errore getBadge:', error.message);
    res.status(500).json({ error: 'Errore nel recupero dei badge' });
  }
};

// ─── GET /api/utenti/progressione ────────────────────────────────────────────
/**
 * Restituisce il riepilogo completo della progressione dell'utente.
 * Usato dalla sidebar e dalla pagina profilo.
 */
exports.getProgressione = async (req, res) => {
  try {
    const utente = await Utente.findById(req.utente.id)
      .select('esperienza badges punti');
    if (!utente) return res.status(404).json({ message: 'Utente non trovato' });

    res.status(200).json({
      livelloComplessivo: utente.esperienza.livelloComplessivo,
      livelloTeorico:     utente.esperienza.livelloTeorico,
      livelloPratico:     utente.esperienza.livelloPratico,
      puntiQuiz:          utente.esperienza.puntiQuiz,
      kmTotali:           utente.esperienza.kmTotali,
      dislivelloTotale:   utente.esperienza.dislivelloTotale,
      sentieriPercorsi:   utente.esperienza.sentieri.length,
      quizCompletati:     utente.esperienza.quizCompletati.length,
      badges:             utente.badges,
      punti:              utente.punti,
    });
  } catch (error) {
    console.error('Errore getProgressione:', error.message);
    res.status(500).json({ error: 'Errore nel recupero della progressione' });
  }
};