/**
 * @file sessioneController.js
 * @description Controller per la gestione delle sessioni quiz e dei progressi utente.
 * Implementa il flusso: avvia sessione → rispondi → termina → aggiorna punti.
 * Corrisponde ai metodi avvia(), termina() e calcolaPunteggio() della classe Quiz (D2 sezione 2.3)
 * e ai metodi addPunti(), calcolaLivello() della classe ProgressiUtente (D2 sezione 2.2).
 */

const Quiz = require('../models/Quiz');
const Badge = require('../models/Badge');
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
    const domandePerClient = quiz.domande.map((d) => {
      let risposteClient = d.risposte.map((r) => ({ _id: r._id, testo: r.testo }));
      let opzioniDestra;

      if (d.tipo === 'riordinamento') {
        // Mescola le voci prima di inviarle (non rivela l'ordine corretto)
        for (let i = risposteClient.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [risposteClient[i], risposteClient[j]] = [risposteClient[j], risposteClient[i]];
        }
      }

      if (d.tipo === 'collegamento') {
        // Mescola il lato sinistro
        for (let i = risposteClient.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [risposteClient[i], risposteClient[j]] = [risposteClient[j], risposteClient[i]];
        }
        // Raccoglie i valori del lato destro (coppia) e li mescola separatamente
        opzioniDestra = d.risposte.map((r) => r.coppia);
        for (let i = opzioniDestra.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [opzioniDestra[i], opzioniDestra[j]] = [opzioniDestra[j], opzioniDestra[i]];
        }
      }

      // puntaImmagine: manda URL e margine, mai il puntoCorretto
      if (d.tipo === 'puntaImmagine') {
        return {
          _id: d._id,
          testo: d.testo,
          tipo: d.tipo,
          tempo: d.tempo,
          puntiChevale: d.puntiChevale,
          numRisposteCorrette: 0,
          risposte: [],
          immagineUrl: d.immagineUrl,
          margine: d.margine,
        };
      }

      return {
        _id: d._id,
        testo: d.testo,
        tipo: d.tipo,
        tempo: d.tempo,
        puntiChevale: d.puntiChevale,
        numRisposteCorrette: (d.tipo === 'riordinamento' || d.tipo === 'collegamento') ? 0 : d.risposte.filter((r) => r.eCorretta).length,
        risposte: risposteClient,
        ...(opzioniDestra !== undefined && { opzioniDestra }),
      };
    });

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
    const { idDomanda, idRisposte, ordine, coppie, punto } = req.body;
    const hasRisposte = Array.isArray(idRisposte) && idRisposte.length > 0;
    const hasOrdine = Array.isArray(ordine) && ordine.length > 0;
    const hasCoppie = Array.isArray(coppie) && coppie.length > 0;
    const hasPunto = punto && typeof punto.x === 'number' && typeof punto.y === 'number';

    if (!idDomanda || (!hasRisposte && !hasOrdine && !hasCoppie && !hasPunto)) {
      return res.status(400).json({
        successo: false,
        messaggio: 'idDomanda e idRisposte (o ordine per riordinamento) sono obbligatori',
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
    
    // Valutazione diversa in base al tipo di domanda
    if (domanda.tipo === 'riordinamento') {
      const ordineDato = req.body.ordine; // array di id nell'ordine scelto dal client

      if (!Array.isArray(ordineDato) || ordineDato.length === 0) {
        return res.status(400).json({ successo: false, messaggio: 'ordine (array) è obbligatorio per il riordinamento' });
      }

      // ordine corretto: risposte ordinate per posizione crescente
      const ordineCorretto = [...domanda.risposte]
        .sort((a, b) => (a.posizione ?? 0) - (b.posizione ?? 0))
        .map((r) => r._id.toString());

      const corretta = ordineDato.length === ordineCorretto.length &&
        ordineDato.every((id, i) => id === ordineCorretto[i]);

      const puntiOttenuti = corretta ? domanda.puntiChevale : 0;

      sessione.risposteDate.push({
        idDomanda: domanda._id,
        idRisposte: ordineDato, // salva l'ordine dato dall'utente
        corretta,
        puntiOttenuti,
        tipo: 'riordinamento',
      });
      sessione.punteggioOttenuto += puntiOttenuti;
      await sessione.save();

      // Restituisce l'ordine corretto con i testi, utile per il feedback
      const vociOrdinate = ordineCorretto.map((id) => {
        const r = domanda.risposte.find((r) => r._id.toString() === id);
        return r ? r.testo : id;
      });

      return res.status(200).json({
        successo: true,
        dati: {
          corretta,
          puntiOttenuti,
          risposteCorrette: vociOrdinate,
        },
      });
    }

    if (domanda.tipo === 'collegamento') {

      const coppieDate = req.body.coppie;
      // es. [{ sinistra: 'id_aquila', destra: 'Verso: fischio acuto' }, ...]

      // per ogni coppia formata dal bambino, verifico se corrisponde a quella salvata nel DB
      let tutteCorrette = true;
      const dettaglio = coppieDate.map(coppia => {
        const risposta = domanda.risposte.find(r => r._id.toString() === coppia.sinistra);

        const correttaQuestaCopp = risposta && risposta.coppia.trim().toLowerCase() === coppia.destra.trim().toLowerCase();

        if (!correttaQuestaCopp) tutteCorrette = false;
          return {
            sinistra: risposta?.testo || coppia.sinistra,
            destra: coppia.destra,
            corretto: correttaQuestaCopp,
            coppiaCorretta: risposta?.coppia,
          };
        });

        const puntiCollegamento = tutteCorrette ? domanda.puntiChevale : 0;
        sessione.risposteDate.push({
          idDomanda: domanda._id,
          corretta: tutteCorrette,
          puntiOttenuti: puntiCollegamento,
          tipo: 'collegamento',
          coppie: dettaglio.map((d) => ({ sinistra: d.sinistra, destra: d.destra })),
        });
        sessione.punteggioOttenuto += puntiCollegamento;
        await sessione.save();

        return res.status(200).json({
          successo: true,
          dati: {
            corretta: tutteCorrette,
            puntiOttenuti: puntiCollegamento,
            dettaglio,
          },
        });
    }

    if (domanda.tipo === 'puntaImmagine') {
      if (!hasPunto) {
        return res.status(400).json({ successo: false, messaggio: 'punto {x, y} obbligatorio per puntaImmagine' });
      }
      const px = domanda.puntoCorretto?.x ?? 0;
      const py = domanda.puntoCorretto?.y ?? 0;
      const distanza = Math.sqrt((punto.x - px) ** 2 + (punto.y - py) ** 2);
      const correttaPunto = distanza <= (domanda.margine ?? 10);
      const puntiPunto = correttaPunto ? domanda.puntiChevale : 0;

      sessione.risposteDate.push({
        idDomanda: domanda._id,
        corretta: correttaPunto,
        puntiOttenuti: puntiPunto,
        tipo: 'puntaImmagine',
      });
      sessione.punteggioOttenuto += puntiPunto;
      await sessione.save();

      return res.status(200).json({
        successo: true,
        dati: {
          corretta: correttaPunto,
          puntiOttenuti: puntiPunto,
          puntoCorretto: { x: px, y: py },
          margine: domanda.margine ?? 10,
          distanza: Math.round(distanza * 10) / 10,
        },
      });
    }

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

    // Calcola aggiornamenti badge rilevanti per questo quiz (punti o stessa categoria)
    let badgeAggiornati = [];
    try {
      const badgesRilevanti = await Badge.find({
        $or: [
          { 'condizione.tipo': 'punti' },
          { 'condizione.tipo': 'categoria', 'condizione.categorie': quiz.categoria },
        ],
      });

      const quizCompletatiPerfetti = progressi.quizCompletati.filter(
        (q) => q.punteggioMassimo > 0 && q.punteggio >= q.punteggioMassimo
      );
      const completatiIds = [...new Set(quizCompletatiPerfetti.map((q) => q.idQuiz.toString()))];

      const badgeCalcolati = await Promise.all(
        badgesRilevanti.map(async (badge) => {
          let percentuale = 0;
          if (badge.condizione.tipo === 'punti') {
            percentuale =
              badge.condizione.sogliaPunti > 0
                ? Math.min(100, Math.round((progressi.punti / badge.condizione.sogliaPunti) * 100))
                : 0;
          } else {
            const totale = await Quiz.countDocuments({ categoria: { $in: badge.condizione.categorie } });
            if (totale > 0) {
              const fatto = await Quiz.countDocuments({
                _id: { $in: completatiIds },
                categoria: { $in: badge.condizione.categorie },
              });
              percentuale = Math.min(100, Math.round((fatto / totale) * 100));
            }
          }
          return { _id: badge._id, nome: badge.nome, icona: badge.icona, percentuale, ottenuto: percentuale >= 100 };
        })
      );

      badgeAggiornati = badgeCalcolati.filter((b) => b.percentuale > 0);
    } catch (_) {}

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
        badgeAggiornati,
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
