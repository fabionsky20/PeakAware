/**
 * @file database.js
 * @description Configurazione intelligente per MongoDB.
 * Gestisce lo switch tra locale (Uni) e cloud (Atlas).
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 1. Determina quale URI usare
    // Se DB_MODE è 'ATLAS', usa la stringa cloud, altrimenti quella locale
    const dbURI = process.env.DB_MODE === 'ATLAS' 
                  ? process.env.MONGO_ATLAS 
                  : process.env.MONGO_LOCAL;

    // 2. Connessione
    const conn = await mongoose.connect(dbURI, {
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000,         
    });

    // 3. Feedback visivo nel terminale
    console.log("------------------------------------------");
    console.log(`✅ MongoDB Connesso: ${conn.connection.host}`);
    console.log(`📍 Modalità: ${process.env.DB_MODE || 'LOCAL (Default)'}`);
    console.log("------------------------------------------");

  } catch (error) {
    console.error("------------------------------------------");
    console.error(`❌ Errore MongoDB: ${error.message}`);
    console.log("💡 Tip: Se sei in Uni, ricorda di lanciare 'dbon'");
    console.log("💡 Controlla il file .env e la variabile DB_MODE");
    console.log("------------------------------------------");
    
    // In sviluppo è meglio non crashare il server, come indicato nel tuo file originale
  }
};

module.exports = connectDB;