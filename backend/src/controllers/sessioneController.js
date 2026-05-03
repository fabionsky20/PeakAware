/**
 * @file sessioneController.js
 * @description Controller per la gestione delle sessioni quiz e dei progressi utente.
 * Implementa il flusso: avvia sessione → rispondi → termina → aggiorna punti.
 * Corrisponde ai metodi avvia(), termina() e calcolaPunteggio() della classe Quiz (D2 sezione 2.3)
 * e ai metodi addPunti(), calcolaLivello() della classe ProgressiUtente (D2 sezione 2.2).
 */

const Quiz = require('../models/Quiz');
const Utente = require('../models/Utente');
const SessioneQuiz = require('../models/SessioneQuiz');
const ProgressiUtente = require('../models/ProgressiUtente');

// ========================
// HELPER
// ========================

/**
 * Calcola il livello dell'utente in base ai punti totali accumulati.
 * Corrisponde al metodo calcolaLivello() di ProgressiUtente (D2 sezione 2.2).
 *
 * @param {number} punti - Punti totali dell'utente
 * @returns {number} Livello da 1 a 5
 */
const calcolaLivello = (punti) => {
  if (punti >= 1000) return 5;
  if (punti >= 600)  return 4;
  if (punti >= 300)  return 3;
  if (punti >= 100)  return 2;
  return 1;
};

// ========================
// CONTROLLER SESSIONE
// ========================

/**
 * POST /api/educazione/sessione/avvia/:quizId
 * Avvia una nuova sessione quiz per l'utente autenticato.
 * Restituisce le domande del quiz senza esporre il campo eCorretta,
 * così il client non può dedurre le risposte corrette dalla risposta HTTP.
 * Corrisponde al metodo avvia() della classe Quiz (D2 sezione 2.3).
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.quizId - ID MongoDB del quiz da avviare
 * @param {Object} req.utente - Utente autenticato (aggiunto dal middleware proteggi)
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con sessioneId e domande (senza risposte corrette)
 */
const avviaSessione = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);

    if (!quiz) {
      return res.status(404).json({
        successo: false,
        messaggio: 'Quiz non trovato',
      });
    }

    const sessione = await SessioneQuiz.create({
      idUtente: req.utente._id,
      idQuiz: quiz._id,
    });

    // Costruisce le domande da inviare al client rimuovendo eCorretta da ogni risposta
    const domandePerClient = quiz.domande.map((d) => ({
      _id: d._id,
      testo: d.testo,
      tipo: d.tipo,
      tempo: d.tempo,
      puntiChevale: d.puntiChevale,
      numRisposteCorrette: d.risposte.filter((r) => r.eCorretta).length,
      risposte: d.risposte.map((r) => ({
        _id: r._id,
        testo: r.testo,
        // eCorretta non viene incluso: il client non deve conoscere la risposta
      })),
    }));

    res.status(201).json({
      successo: true,
      messaggio: 'Sessione avviata',
      dati: {
        sessioneId: sessione._id,
        quiz: {
          _id: quiz._id,
          titolo: quiz.titolo,
          categoria: quiz.categoria,
          difficolta: quiz.difficolta,
          tempo: quiz.tempo,
          punteggio: quiz.punteggio,
        },
        domande: domandePerClient,
      },
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nell\'avvio della sessione',
      errore: error.message,
    });
  }
};

/**
 * POST /api/educazione/sessione/:id/rispondi
 * Registra le risposte dell'utente a una domanda e restituisce il feedback immediato.
 * Supporta domande con una o più risposte corrette: la domanda è corretta solo se
 * l'utente seleziona esattamente tutte e sole le risposte corrette.
 * Implementa il requisito US-08 (feedback immediato dopo ogni risposta).
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.id - ID della sessione quiz
 * @param {string} req.body.idDomanda - ID della domanda a cui si risponde
 * @param {string[]} req.body.idRisposte - Array di ID delle risposte scelte dall'utente
 * @param {Object} req.utente - Utente autenticato
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con corretta, puntiOttenuti e testi delle risposte corrette
 */
const rispondi = async (req, res) => {
  try {
    const { idDomanda, idRisposte } = req.body;

    if (!idDomanda || !Array.isArray(idRisposte) || idRisposte.length === 0) {
      return res.status(400).json({
        successo: false,
        messaggio: 'idDomanda e idRisposte (array non vuoto) sono obbligatori',
      });
    }

    const sessione = await SessioneQuiz.findById(req.params.id);

    if (!sessione) {
      return res.status(404).json({
        successo: false,
        messaggio: 'Sessione non trovata',
      });
    }

    // Verifica che la sessione appartenga all'utente che sta chiamando l'endpoint
    if (sessione.idUtente.toString() !== req.utente._id.toString()) {
      return res.status(403).json({
        successo: false,
        messaggio: 'Accesso negato: questa sessione non appartiene all\'utente',
      });
    }

    if (!sessione.inCorso) {
      return res.status(400).json({
        successo: false,
        messaggio: 'La sessione è già terminata',
      });
    }

    // Controlla se questa domanda è già stata risposta nella sessione corrente
    const giaRisposta = sessione.risposteDate.some(
      (r) => r.idDomanda.toString() === idDomanda
    );

    if (giaRisposta) {
      return res.status(400).json({
        successo: false,
        messaggio: 'Questa domanda è già stata risposta',
      });
    }

    const quiz = await Quiz.findById(sessione.idQuiz);

    const domanda = quiz.domande.id(idDomanda);

    if (!domanda) {
      return res.status(404).json({
        successo: false,
        messaggio: 'Domanda non trovata nel quiz',
      });
    }

    // Calcola quali risposte sono corrette per questa domanda
    const risposteCorretteIds = domanda.risposte
      .filter((r) => r.eCorretta)
      .map((r) => r._id.toString());

    // La risposta è corretta solo se l'utente ha selezionato esattamente
    // tutte e sole le risposte corrette (nessuna in più, nessuna in meno)
    const tutteSelezionateCorrette = idRisposte.every((id) => risposteCorretteIds.includes(id));
    const tutteCorretteSelezionate = risposteCorretteIds.every((id) => idRisposte.includes(id));
    const corretta = tutteSelezionateCorrette && tutteCorretteSelezionate;

    const puntiOttenuti = corretta ? domanda.puntiChevale : 0;

    sessione.risposteDate.push({ idDomanda, idRisposte, corretta, puntiOttenuti });
    sessione.punteggioOttenuto += puntiOttenuti;
    await sessione.save();

    // Restituisce i testi di tutte le risposte corrette per il feedback (US-08)
    const risposteCorrette = domanda.risposte
      .filter((r) => r.eCorretta)
      .map((r) => r.testo);

    res.status(200).json({
      successo: true,
      dati: {
        corretta,
        puntiOttenuti,
        risposteCorrette,
      },
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nel registrare la risposta',
      errore: error.message,
    });
  }
};

/**
 * POST /api/educazione/sessione/:id/termina
 * Chiude la sessione quiz e aggiorna i progressi dell'utente.
 * Implementa OCL constraint #6 (sessione deve essere inCorso),
 * OCL constraint #8 (punteggio restituito >= 0).
 * Aggiorna Utente.punti e ProgressiUtente.
 * Implementa i requisiti US-09 (punteggio finale) e US-14 (punti totali).
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.id - ID della sessione quiz
 * @param {Object} req.utente - Utente autenticato
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con punteggio, riepilogo risposte e punti totali aggiornati
 */
const terminaSessione = async (req, res) => {
  try {
    const sessione = await SessioneQuiz.findById(req.params.id);

    if (!sessione) {
      return res.status(404).json({
        successo: false,
        messaggio: 'Sessione non trovata',
      });
    }

    if (sessione.idUtente.toString() !== req.utente._id.toString()) {
      return res.status(403).json({
        successo: false,
        messaggio: 'Accesso negato: questa sessione non appartiene all\'utente',
      });
    }

    // OCL constraint #6: la sessione deve essere inCorso per poter essere terminata
    if (!sessione.inCorso) {
      return res.status(400).json({
        successo: false,
        messaggio: 'La sessione è già terminata (OCL #6)',
      });
    }

    sessione.inCorso = false;
    sessione.terminata = true;
    await sessione.save();

    const quiz = await Quiz.findById(sessione.idQuiz);

    // Somma i puntiChevale di tutte le domande — usata come denominatore per la proporzione
    const totalePuntiChevale = quiz.domande.reduce((tot, d) => tot + d.puntiChevale, 0);
    const puntiGrezzi = Math.max(0, sessione.punteggioOttenuto);

    // Scala il risultato sul punteggio massimo del quiz (quello mostrato sulla card).
    // Questo garantisce coerenza: se quiz.punteggio = 100 e l'utente ha risposto
    // correttamente a metà del peso totale, ottiene 50 punti. OCL constraint #8.
    const punteggioMassimo = quiz.punteggio;
    const punteggioOttenuto = totalePuntiChevale > 0
      ? Math.round((puntiGrezzi / totalePuntiChevale) * punteggioMassimo)
      : 0;

    // Aggiorna o crea il documento ProgressiUtente per questo utente
    let progressi = await ProgressiUtente.findOne({ idUtente: req.utente._id });

    if (!progressi) {
      progressi = new ProgressiUtente({ idUtente: req.utente._id });
    }

    // Se il quiz è già stato completato in precedenza non si aggiungono punti,
    // così l'utente può rifare il quiz senza accumulare punti all'infinito.
    const giaCompletato = progressi.quizCompletati.some(
      (q) => q.idQuiz.toString() === sessione.idQuiz.toString()
    );
    const puntiDaAggiungere = giaCompletato ? 0 : punteggioOttenuto;

    await Utente.findByIdAndUpdate(req.utente._id, {
      $inc: { punti: puntiDaAggiungere },
    });

    progressi.punti += puntiDaAggiungere;
    progressi.livello = calcolaLivello(progressi.punti);
    progressi.dataUltimaAttivita = new Date();
    progressi.quizCompletati.push({
      idQuiz: sessione.idQuiz,
      punteggio: punteggioOttenuto,
      punteggioMassimo,
      completatoIl: new Date(),
    });

    await progressi.save();

    res.status(200).json({
      successo: true,
      messaggio: 'Sessione terminata',
      dati: {
        punteggioOttenuto,
        punteggioMassimo,
        puntiAggiunti: puntiDaAggiungere,
        riepilogoRisposte: sessione.risposteDate,
        puntiTotali: progressi.punti,
        livello: progressi.livello,
      },
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nella conclusione della sessione',
      errore: error.message,
    });
  }
};

// ========================
// CONTROLLER PROGRESSI
// ========================

/**
 * GET /api/educazione/progressi
 * Restituisce i progressi dell'utente autenticato: punti totali, livello,
 * numero di quiz completati e data dell'ultima attività.
 * Corrisponde al metodo getStatistiche() di ProgressiUtente (D2 sezione 2.2).
 * Implementa il requisito US-14 (visualizzazione punti totali).
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {Object} req.utente - Utente autenticato
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con punti, livello, quizCompletati e dataUltimaAttivita
 */
const getProgressi = async (req, res) => {
  try {
    const progressi = await ProgressiUtente.findOne({ idUtente: req.utente._id });

    // Se l'utente non ha ancora completato nessun quiz, restituisce valori di default
    if (!progressi) {
      return res.status(200).json({
        successo: true,
        dati: {
          punti: 0,
          livello: 1,
          quizCompletati: [],
          dataUltimaAttivita: null,
        },
      });
    }

    res.status(200).json({
      successo: true,
      dati: {
        punti: progressi.punti,
        livello: progressi.livello,
        numeroQuizCompletati: progressi.quizCompletati.length,
        quizCompletati: progressi.quizCompletati,
        dataUltimaAttivita: progressi.dataUltimaAttivita,
      },
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nel recupero dei progressi',
      errore: error.message,
    });
  }
};

module.exports = {
  avviaSessione,
  rispondi,
  terminaSessione,
  getProgressi,
};
