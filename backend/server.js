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
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PeakAware API',
      version: '1.0.0',
      description: 'API per la gestione dei sentieri, autenticazione e contenuti educativi di PeakAware.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Server di sviluppo locale',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/models/*.js', './src/middleware/*.js'], // Percorsi dei file con annotazioni Swagger
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Espone il JSON della specifica OpenAPI per il generatore del frontend
 */
app.get('/api-docs-json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));



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
  console.log(`Server in ascolto sulla porta ${PORT}`);
});