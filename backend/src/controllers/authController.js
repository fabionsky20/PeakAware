/**
 * @file authController.js
 * @description Controller per la gestione dell'autenticazione.
 * Contiene la logica per registrazione e login degli utenti.
 * Corrisponde ai metodi registrati() e login() della classe Utente (D2 sezione 2.2).
 */

const jwt = require('jsonwebtoken');
const Utente = require('../models/Utente');
const ProgressiUtente = require('../models/ProgressiUtente');

/**
 * Genera un token JWT per l'utente autenticato.
 * Include id e ruolo nel payload per permettere
 * al frontend di determinare i permessi senza chiamate aggiuntive.
 *
 * @param {string} id - ID MongoDB dell'utente
 * @param {string} ruolo - Ruolo dell'utente ('utente' o 'admin')
 * @returns {string} Token JWT firmato con JWT_SECRET
 */
const generaToken = (id, ruolo) => {
  return jwt.sign(
    { id, ruolo },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * POST /api/auth/registrati
 * Registra un nuovo utente sulla piattaforma.
 * La password viene cifrata automaticamente dal middleware in Utente.js.
 * Implementa il metodo registrati(email, password) del D2.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.body.email - Email del nuovo utente
 * @param {string} req.body.password - Password in chiaro
 * @param {string} [req.body.eta] - Età opzionale
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con dati utente e token JWT, o errore
 */
const registrati = async (req, res) => {
  try {
    const { email, password, eta } = req.body;

    // Verifica che email e password siano presenti
    if (!email || !password) {
      return res.status(400).json({
        successo: false,
        messaggio: 'Email e password sono obbligatorie',
      });
    }

    // Verifica che l'email non sia già registrata
    const utenteEsistente = await Utente.findOne({ email });
    if (utenteEsistente) {
      return res.status(400).json({
        successo: false,
        messaggio: 'Email già registrata',
      });
    }

    // Crea il nuovo utente — la password viene cifrata dal middleware pre('save')
    const nuovoUtente = await Utente.create({
      email,
      password,
      eta: eta || null,
    });

    // Genera il token JWT per la sessione
  const token = generaToken(nuovoUtente._id, nuovoUtente.ruolo);

    // Risponde con i dati pubblici dell'utente (mai restituire la password)
    res.status(201).json({
      successo: true,
      messaggio: 'Registrazione avvenuta con successo',
      dati: {
        id: nuovoUtente._id,
        email: nuovoUtente.email,
        ruolo: nuovoUtente.ruolo,
        punti: nuovoUtente.punti,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore interno del server',
      errore: error.message,
    });
  }
};

/**
 * POST /api/auth/login
 * Autentica un utente esistente e restituisce un token JWT.
 * Implementa il metodo login(email, password) del D2.
 * Verifica il constraint OCL #4: dopo il login l'email corrisponde a quella fornita.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.body.email - Email dell'utente
 * @param {string} req.body.password - Password in chiaro
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con dati utente e token JWT, o errore
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verifica che email e password siano presenti
    if (!email || !password) {
      return res.status(400).json({
        successo: false,
        messaggio: 'Email e password sono obbligatorie',
      });
    }

    // Cerca l'utente nel database per email
    const utente = await Utente.findOne({ email });
    if (!utente) {
      return res.status(401).json({
        successo: false,
        messaggio: 'Credenziali non valide',
      });
    }

    // Verifica la password usando il metodo definito in Utente.js
    const passwordCorretta = await utente.verificaPassword(password);
    if (!passwordCorretta) {
      return res.status(401).json({
        successo: false,
        messaggio: 'Credenziali non valide',
      });
    }

    // Genera il token JWT per la sessione
    const token = generaToken(utente._id, utente.ruolo);

    // Risponde con i dati pubblici dell'utente (mai restituire la password)
    res.status(200).json({
      successo: true,
      messaggio: 'Login effettuato con successo',
      dati: {
        id: utente._id,
        email: utente.email,
        ruolo: utente.ruolo,
        punti: utente.punti,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      successo: false,
      messaggio: 'Errore interno del server',
      errore: error.message,
    });
  }
};

/**
 * GET /api/auth/profilo
 * Restituisce i dati pubblici dell'utente autenticato e i suoi progressi.
 * Corrisponde al metodo modificaProfilo() della classe Utente (D2 sezione 2.2).
 *
 * @async
 * @param {Object} req - Richiesta Express (req.utente aggiunto da proteggi)
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con email, ruolo, eta, punti, livello
 */
const getProfilo = async (req, res) => {
  try {
    const utente = await Utente.findById(req.utente._id).select('-password');

    if (!utente) {
      return res.status(404).json({ successo: false, messaggio: 'Utente non trovato' });
    }

    const progressi = await ProgressiUtente.findOne({ idUtente: req.utente._id });

    res.status(200).json({
      successo: true,
      dati: {
        email: utente.email,
        ruolo: utente.ruolo,
        eta: utente.eta,
        punti: progressi?.punti ?? 0,
        livello: progressi?.livello ?? 1,
      },
    });
  } catch (error) {
    res.status(500).json({ successo: false, messaggio: 'Errore nel recupero del profilo', errore: error.message });
  }
};

/**
 * PUT /api/auth/cambia-password
 * Aggiorna la password dell'utente autenticato.
 * Verifica il constraint OCL #3: la nuova password deve essere diversa da quella attuale.
 *
 * @async
 * @param {Object} req - Richiesta Express
 * @param {string} req.body.passwordAttuale - Password corrente in chiaro
 * @param {string} req.body.nuovaPassword - Nuova password in chiaro
 * @param {Object} res - Risposta Express
 * @returns {Object} JSON con esito dell'operazione
 */
const cambiaPassword = async (req, res) => {
  try {
    const { passwordAttuale, nuovaPassword } = req.body;

    if (!passwordAttuale || !nuovaPassword) {
      return res.status(400).json({
        successo: false,
        messaggio: 'passwordAttuale e nuovaPassword sono obbligatorie',
      });
    }

    const utente = await Utente.findById(req.utente._id);

    const passwordCorretta = await utente.verificaPassword(passwordAttuale);
    if (!passwordCorretta) {
      return res.status(401).json({ successo: false, messaggio: 'Password attuale non corretta' });
    }

    // OCL constraint #3: la nuova password deve essere diversa da quella attuale
    const uguale = await utente.verificaPassword(nuovaPassword);
    if (uguale) {
      return res.status(400).json({
        successo: false,
        messaggio: 'La nuova password deve essere diversa da quella attuale',
      });
    }

    utente.password = nuovaPassword;
    await utente.save(); // il middleware pre('save') cifra automaticamente

    res.status(200).json({ successo: true, messaggio: 'Password aggiornata con successo' });
  } catch (error) {
    res.status(500).json({ successo: false, messaggio: 'Errore nel cambio password', errore: error.message });
  }
};

module.exports = { registrati, login, getProfilo, cambiaPassword }