/**
 * @file utenteController.js
 * @description Controller per le azioni sul profilo utente:
 * registrazione sentieri percorsi, completamento quiz, badge e progressione.
 * 
 * authController.js gestisce: registrati, login, getProfilo, cambiaPassword
 * utenteController.js gestisce: tutto ciò che riguarda la progressione, gesticse i contatti d'emergenza e la posizione in escursione.
 */

const Utente = require('../models/Utente');
const ProgressiUtente = require('../models/ProgressiUtente');
const Livello = require('../models/Livello');
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
// ─── GET /api/utenti/progressione ────────────────────────────────────────────
exports.getProgressione = async (req, res) => {
  try {
    const utente = await Utente.findById(req.utente.id)
      .select('esperienza badges punti');
    if (!utente) return res.status(404).json({ message: 'Utente non trovato' });

    const progressi = await ProgressiUtente.findOne({ idUtente: req.utente.id });
    // Livello utente = quello calcolato dal sistema quiz (ProgressiUtente) — il più aggiornato
    const livelloComplessivo = progressi?.livello ?? 1;

    // Numero massimo di livelli configurati: serve al frontend per la scala proporzionale
    const livelloMax = await Livello.findOne().sort({ numero: -1 }).select('numero');
    const maxLivello = livelloMax?.numero ?? 5;

    res.status(200).json({
      livelloComplessivo,
      maxLivello,
      livelloTeorico:     utente.esperienza.livelloTeorico,
      livelloPratico:     utente.esperienza.livelloPratico,
      puntiQuiz:          progressi?.punti ?? utente.esperienza.puntiQuiz,
      kmTotali:           utente.esperienza.kmTotali,
      dislivelloTotale:   utente.esperienza.dislivelloTotale,
      sentieriPercorsi:   utente.esperienza.sentieri.length,
      quizCompletati:     utente.esperienza.quizCompletati.length,
      badges:             utente.badges,
      punti:              progressi?.punti ?? utente.punti,
    });
  } catch (error) {
    console.error('Errore getProgressione:', error.message);
    res.status(500).json({ error: 'Errore nel recupero della progressione' });
  }
}; 

/** Salva o aggiorna i contatti di emergenza dell'utente */
exports.aggiornaContattoEmergenza = async (req, res) => {
  try {
    // 1. Estraiamo la chiave corretta inviata dal frontend
    const { contattiEmergenza } = req.body;
    
    // 2. Verifichiamo che sia effettivamente un array
    if (!Array.isArray(contattiEmergenza)) {
      return res.status(400).json({ 
        successo: false, 
        message: 'contattiEmergenza deve essere un array' 
      });
    }

    // 3. Troviamo l'utente
    const utente = await Utente.findById(req.utente.id);
    if (!utente) {
      return res.status(404).json({ 
        successo: false, 
        message: 'Utente non trovato' 
      });
    }

    // 4. Sovrascriviamo l'intero array con quello nuovo inviato da Angular
    utente.contattoEmergenza = contattiEmergenza;
    
    // 5. Salviamo su DB
    await utente.save();
    
    res.status(200).json({ 
      successo: true, 
      message: 'Contatti di emergenza aggiornati con successo', 
      contatti: utente.contattoEmergenza 
    });
  } catch (error) {
    console.error('Errore aggiornaContattoEmergenza:', error.message);
    res.status(500).json({ 
      successo: false, 
      message: 'Errore nel salvataggio dei contatti' 
    });
  }
};

/** Riceve gli update di posizione dal frontend ogni 5 minuti */
exports.aggiornaPosizioneGps = async (req, res) => {
  try {
    const { lat, lng, sentieroId, nomeSentiero, isAttiva } = req.body;
    
    const utente = await Utente.findById(req.utente.id);
    
    utente.posizioneAttiva = {
      isAttiva,
      sentieroId: isAttiva ? sentieroId : null,
      nomeSentiero: isAttiva ? nomeSentiero : null,
      coords: isAttiva ? { lat, lng } : { lat: null, lng: null },
      ultimoAggiornamento: isAttiva ? new Date() : null
    };

    await utente.save();
    res.status(200).json({ message: 'Posizione escursione sincronizzata.' });
  } catch (error) {
    res.status(500).json({ message: 'Errore nel caricamento della posizione.' });
  }
};

/** Consente al contatto di emergenza di vedere dove si trova l'escursionista */
exports.getPosizioneEscursionista = async (req, res) => {
  try {
    const utenteCorrente = await Utente.findById(req.utente.id);
    if (!utenteCorrente) return res.status(401).json({ successo: false });
    
    const emailContatto = utenteCorrente.email;

    const escursionista = await Utente.findOne({
      contattoEmergenza: {
        $elemMatch: {
          emailRegistrata: { $regex: new RegExp(`^${emailContatto}$`, 'i') },
          condividiItinerario: true
        }
      },
      'posizioneAttiva.isAttiva': true
    }).select('username posizioneAttiva');

    if (!escursionista) {
      return res.status(200).json({ successo: false });
    }

    res.status(200).json({
      successo: true,
      username: escursionista.username,
      coordinate: escursionista.posizioneAttiva.coords,
      sentieroId: escursionista.posizioneAttiva.sentieroId, // <-- AGGIUNTO PER LA MAPPA
      ultimoAggiornamento: escursionista.posizioneAttiva.ultimoAggiornamento
    });
  } catch (error) {
    res.status(500).json({ message: 'Errore nel recupero della posizione condivisa.' });
  }
};