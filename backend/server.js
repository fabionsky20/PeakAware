/**
 * @file server.js
 * @description Entry point del backend PeakAware.
 * Inizializza Express, carica le variabili d'ambiente,
 * connette il database e avvia il server sulla porta configurata.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/database');
const sentieriRoutes = require('./src/routes/sentieriRoutes');
const authRoutes = require('./src/routes/authRoutes');
const educazioneRoutes = require('./src/routes/educazioneRoutes');



const app = express();

// --- Middleware globali ---

/**
 * Abilita CORS per permettere ad Angular (porta 4200)
 * di comunicare con questo backend (porta 3000).
 */
app.use(cors());

/**
 * Permette a Express di leggere il body delle richieste
 * in formato JSON (necessario per POST e PUT).
 */
app.use(express.json());

// --- Connessione al database ---
connectDB();

// --- Routes ---
/**
 * GET /
 * Endpoint di verifica: conferma che il server è attivo.
 */
app.get('/', (req, res) => {
  res.json({ messaggio: 'PeakAware backend attivo' });
});

/**
 * Routes autenticazione — registrazione e login.
 * Prefisso: /api/auth
 */
app.use('/api/auth', authRoutes);

/**
 * Routes educazione — video e quiz.
 * Prefisso: /api/educazione
 */
app.use('/api/educazione', educazioneRoutes);

/**
 * Routes sentieri — importazione e visualizzazione sentieri.
 * Prefisso: /api/sentieri
 */
app.use('/api/sentieri', sentieriRoutes);



// --- Avvio server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
 // DEBUG: Ora che il server è acceso, controlliamo le rotte
  console.log("--- Elenco Rotte Caricate ---");
  if (app._router && app._router.stack) {
    app._router.stack.forEach(function(r){
      if (r.route && r.route.path){
        console.log(`Rotta base: ${Object.keys(r.route.methods)} ${r.route.path}`);
      } else if (r.name === 'router'){ 
         r.handle.stack.forEach(function(handler){
            if (handler.route) {
                console.log(`Rotta nel sotto-router: ${Object.keys(handler.route.methods)} ${handler.route.path}`);
            }
         });
      }
    });
  }
  console.log(`Server in ascolto sulla porta ${PORT}`);
});