/**
 * @file database.js
 * @description Configurazione e connessione a MongoDB tramite Mongoose.
 * Legge l'URI di connessione dalla variabile d'ambiente MONGODB_URI.
 */

const mongoose = require('mongoose');

/**
 * Stabilisce la connessione al database MongoDB locale.
 * In caso di errore logga il problema ma non termina il processo,
 * così il server resta attivo durante lo sviluppo.
 *
 * @async
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout selezione server: 5 secondi
      socketTimeoutMS: 45000,         // Timeout socket: 45 secondi
    });
    console.log(`MongoDB connesso: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB non raggiungibile: ${error.message}`);
  }
};

module.exports = connectDB;