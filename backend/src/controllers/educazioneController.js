/**
 * @file educazioneController.js
 * @description Controller per il Modulo Educazione.
 * Gestisce le operazioni CRUD su Quiz e Video.
 * Corrisponde al componente Modulo Educazione del D2 sezione 1.3.
 */

const Quiz = require('../models/Quiz');
const Video = require('../models/Video');

// ========================
// CONTROLLER QUIZ
// ========================

/**
 * GET /api/educazione/quiz
 * Restituisce tutti i quiz disponibili.
 * Supporta filtri opzionali tramite query string:
 * - categoria: filtra per categoria (es. ?categoria=meteo)
 * - difficolta: filtra per livello di difficoltà (es. ?difficolta=2)
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con array di quiz
 */
const getTuttiIQuiz = async (req, res) => {
  try {
    const filtro = {};

    // Aggiunge filtri opzionali se presenti nella query string
    if (req.query.categoria) filtro.categoria = req.query.categoria;
    if (req.query.difficolta) filtro.difficolta = Number(req.query.difficolta);

    const quiz = await Quiz.find(filtro).select('-domande'); // Esclude le domande per alleggerire la risposta
    
    res.status(200).json({
      successo: true,
      totale: quiz.length,
      dati: quiz,
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nel recupero dei quiz',
      errore: error.message,
    });
  }
};

/**
 * GET /api/educazione/quiz/:id
 * Restituisce un singolo quiz completo di domande e risposte.
 * Quando l'utente avvia un quiz specifico.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.id - ID MongoDB del quiz
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con il quiz completo
 */
const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        successo: false,
        messaggio: 'Quiz non trovato',
      });
    }

    res.status(200).json({
      successo: true,
      dati: quiz,
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nel recupero del quiz',
      errore: error.message,
    });
  }
};

/**
 * POST /api/educazione/quiz
 * Crea un nuovo quiz nel database.
 * Accessibile solo agli utenti con ruolo admin (middleware soloAdmin).
 * Corrisponde alla funzionalità del componente Gestione Contenuti (D2 sezione 1.3).
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {Object} req.body - Dati del quiz (titolo, argomento, domande...)
 * @param {Object} req.utente - Utente autenticato (aggiunto dal middleware proteggi)
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con il quiz creato
 */
const creaQuiz = async (req, res) => {
  try {
    // Aggiunge l'id dell'autore (admin/SAT) preso dal token JWT
    const datiQuiz = {
      ...req.body,
      idAutore: req.utente._id,
    };

    const nuovoQuiz = await Quiz.create(datiQuiz);

    res.status(201).json({
      successo: true,
      messaggio: 'Quiz creato con successo',
      dati: nuovoQuiz,
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nella creazione del quiz',
      errore: error.message,
    });
  }
};

/**
 * PUT /api/educazione/quiz/:id
 * Aggiorna un quiz esistente.
 * Accessibile solo agli utenti con ruolo admin.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.id - ID MongoDB del quiz da aggiornare
 * @param {Object} req.body - Campi da aggiornare
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con il quiz aggiornato
 */
const aggiornaQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,       // Restituisce il documento aggiornato
        runValidators: true, // Esegue i validator dello schema anche in update
      }
    );

    if (!quiz) {
      return res.status(404).json({
        successo: false,
        messaggio: 'Quiz non trovato',
      });
    }

    res.status(200).json({
      successo: true,
      messaggio: 'Quiz aggiornato con successo',
      dati: quiz,
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nell\'aggiornamento del quiz',
      errore: error.message,
    });
  }
};

/**
 * DELETE /api/educazione/quiz/:id
 * Elimina un quiz dal database.
 * Accessibile solo agli utenti con ruolo admin.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.params.id - ID MongoDB del quiz da eliminare
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con messaggio di conferma
 */
const eliminaQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        successo: false,
        messaggio: 'Quiz non trovato',
      });
    }

    res.status(200).json({
      successo: true,
      messaggio: 'Quiz eliminato con successo',
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nell\'eliminazione del quiz',
      errore: error.message,
    });
  }
};

// ========================
// CONTROLLER VIDEO
// ========================

/**
 * GET /api/educazione/video
 * Restituisce tutti i video disponibili.
 * Supporta filtro opzionale per modulo:
 * - modulo: filtra per modulo (es. ?modulo=educazione)
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con array di video
 */
const getTuttiIVideo = async (req, res) => {
  try {
    const filtro = {};

    if (req.query.modulo) filtro.modulo = req.query.modulo;

    const video = await Video.find(filtro);

    res.status(200).json({
      successo: true,
      totale: video.length,
      dati: video,
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nel recupero dei video',
      errore: error.message,
    });
  }
};

/**
 * POST /api/educazione/video
 * Crea un nuovo video nel database.
 * Accessibile solo agli utenti con ruolo admin.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {Object} req.body - Dati del video (titolo, url, argomento...)
 * @param {Object} req.utente - Utente autenticato (aggiunto dal middleware proteggi)
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con il video creato
 */
const creaVideo = async (req, res) => {
  try {
    
    // Aggiungiamo a tutti i dati del video mandati dal frontend l'id di autore che è protetto 
    const datiVideo = {  
      ...req.body,
      idAutore: req.utente._id,
    };

    const nuovoVideo = await Video.create(datiVideo);

    res.status(201).json({
      successo: true,
      messaggio: 'Video creato con successo',
      dati: nuovoVideo,
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore nella creazione del video',
      errore: error.message,
    });
  }
};

module.exports = {
  getTuttiIQuiz,
  getQuizById,
  creaQuiz,
  aggiornaQuiz,
  eliminaQuiz,
  getTuttiIVideo,
  creaVideo,
};