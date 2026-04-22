/**
 * @file Utente.js
 * @description Modello Mongoose per la classe Utente.
 * Corrisponde alla classe Utente del diagramma delle classi (D2 sezione 2.2).
 * Gestisce autenticazione, profilo e progressi dell'utente sulla piattaforma.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


/**
 * Schema Mongoose per l'entità Utente.
 * Implementa i constraint OCL #1 (email non vuota) e #2 (punti non negativi).
 */
const utenteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email obbligatoria'], // OCL constraint #1
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, 'Password obbligatoria'],
      minlength: [6, 'La password deve avere almeno 6 caratteri'],
    },

    ruolo: {
      type: String,
      enum: ['utente', 'admin'], // Solo questi due valori sono ammessi
      default: 'utente',
    },

    eta: {
      type: Number,
      min: [0, 'Età non valida'],
      max: [120, 'Età non valida'],
    },

    sesso: {
      type: String,
      enum: ['M', 'F', 'altro'],
    },

    livelloEsperienzaMontagna: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },

    livelloAtleticita: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },

    punti: {
      type: Number,
      default: 0,
      min: [0, 'I punti non possono essere negativi'], // OCL constraint #2
    },

    preferenze: {
      type: [String], // Array di stringhe: es. ['naturalistico', 'avventura']
      default: [],
    },

    numeroDiTelefono: {
      type: String,
      default: null,
    },

    fotoProfilo: {
      type: String, // URL della foto
      default: null,
    },
  },
  {
    /**
     * timestamps: true aggiunge automaticamente due campi:
     * - createdAt: data di registrazione (corrisponde a dataDiRegistrazione del D2)
     * - updatedAt: data dell'ultimo aggiornamento
     */
    timestamps: true,
  }
);

/**
 * Middleware Mongoose — eseguito automaticamente prima di ogni save().
 * Cifra la password con bcrypt se è stata modificata.
 * Implementa il requisito di sicurezza: "password cifrata" (D2 classe Utente).
 *
 * @param {Function} next - Callback per passare al middleware successivo
 */
utenteSchema.pre('save', async function () {
  // Salta la cifratura se la password non è stata modificata
  if (!this.isModified('password')) return;

  // Genera il salt e cifra la password (cost factor 10)
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Metodo istanza — confronta la password fornita con quella cifrata nel DB.
 * Usato durante il login per verificare le credenziali (OCL constraint #4).
 *
 * @param {string} passwordFornita - Password in chiaro inserita dall'utente
 * @returns {Promise<boolean>} true se la password è corretta, false altrimenti
 */
utenteSchema.methods.verificaPassword = async function (passwordFornita) {
  return await bcrypt.compare(passwordFornita, this.password);
};

/**
 * Esporta il modello Mongoose 'Utente' basato su utenteSchema.
 * MongoDB creerà automaticamente una collection chiamata 'utenti'.
 */
module.exports = mongoose.model('Utente', utenteSchema);