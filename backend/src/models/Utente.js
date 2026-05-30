/**
 * @file Utente.js
 * @description Modello Mongoose per la classe Utente.
 * Gestisce autenticazione, profilo e sistema di progressione
 * basato su esperienza teorica (quiz) e pratica (sentieri percorsi).
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Sub-schema: singolo sentiero percorso ───────────────────────────────────
const sentierPercorsoSchema = new mongoose.Schema({
  osm_id:     { type: String, required: true },
  nome:       { type: String },             // snapshot del nome al momento
  percorsoIl: { type: Date, default: Date.now },
  km:         { type: Number, default: 0 },
  dislivello: { type: Number, default: 0 }, // D+ in metri
}, { _id: false });

// ─── Sub-schema: singolo quiz completato ────────────────────────────────────
const quizCompletataSchema = new mongoose.Schema({
  quizId:       { type: String, required: true },
  punteggio:    { type: Number, required: true }, // 0-100
  completatoIl: { type: Date, default: Date.now },
}, { _id: false });

// ─── Sub-schema: badge sbloccato ────────────────────────────────────────────
const badgeSchema = new mongoose.Schema({
  id:          { type: String, required: true }, // es. 'prima_escursione'
  sbloccatoIl: { type: Date, default: Date.now },
}, { _id: false });
// ─── Sub-schema: numeri d'emergenza ────────────────────────────────────────────
const numeriEmergenzaSchema = new mongoose.Schema({
  nome:  { type: String, required: true },
  numero: { type: String, required: true },
}, { _id: false });

// ─── Schema principale ───────────────────────────────────────────────────────
const utenteSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username obbligatorio'],
      unique: true,
      trim: true,
      minlength: [3, "L'username deve avere almeno 3 caratteri"],
    },

    email: {
      type: String,
      required: [true, 'Email obbligatoria'],
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
      enum: ['utente', 'admin'],
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

    punti: {
      type: Number,
      default: 0,
      min: [0, 'I punti non possono essere negativi'],
    },

    preferenze: {
      type: [String], // es. ['naturalistico', 'avventura']
      default: [],
    },

    numeroDiTelefono: { type: String, default: null },
    fotoProfilo:      { type: String, default: null },

    // ── Sistema di progressione ──────────────────────────────────────────────
    esperienza: {
      /**
       * Livello teorico: aggiornato completando quiz (1-5).
       * Aumenta accumulando puntiQuiz secondo le soglie definite
       * nel metodo aggiornaLivelloTeorico().
       */
      livelloTeorico: { type: Number, min: 1, max: 5, default: 1 },
      puntiQuiz:      { type: Number, default: 0 },
      quizCompletati: { type: [quizCompletataSchema], default: [] },

      /**
       * Livello pratico: aggiornato percorrendo sentieri (1-5).
       * Tiene conto di km totali e dislivello accumulato.
       */
      livelloPratico:    { type: Number, min: 1, max: 5, default: 1 },
      kmTotali:          { type: Number, default: 0 },
      dislivelloTotale:  { type: Number, default: 0 }, // D+ accumulato in metri
      sentieri:          { type: [sentierPercorsoSchema], default: [] },

      /**
       * Livello complessivo: media pesata (70% pratico, 30% teorico).
       * Calcolato e salvato dal metodo aggiornaLivelloComplessivo().
       * È il campo usato per il consiglio sentieri.
       */
      livelloComplessivo: { type: Number, min: 1, max: 5, default: 1 },
    },

    // ── Badge ────────────────────────────────────────────────────────────────
    /**
     * Badge sbloccati dall'utente.
     * La logica di sblocco è gestita lato backend (badgeService)
     * e non dentro questo schema, per mantenerlo estensibile.
     *
     * Badge previsti (non esaustivi):
     *   prima_escursione   — primo sentiero registrato
     *   quota_2000         — percorso un sentiero sopra i 2000m
     *   km_50 / km_100     — km totali accumulati
     *   dislivello_1000    — D+ accumulato > 1000m
     *   quiz_maestro       — completati 10 quiz con punteggio > 80
     *   esploratore        — 10 sentieri diversi percorsi
     */
    badges: { type: [badgeSchema], default: [] },
  },
  { timestamps: true }
);

// ─── Middleware: cifratura password ─────────────────────────────────────────
utenteSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ─── Metodi istanza ──────────────────────────────────────────────────────────

/** Verifica la password durante il login */
utenteSchema.methods.verificaPassword = async function (passwordFornita) {
  return await bcrypt.compare(passwordFornita, this.password);
};

/**
 * Registra un sentiero percorso, aggiorna i totali e ricalcola i livelli.
 * Da chiamare nel controller dopo che l'utente conferma il completamento.
 *
 * @param {{ osm_id, nome, km, dislivello }} datiSentiero
 */
utenteSchema.methods.aggiungiSentiero = async function (datiSentiero) {
  this.esperienza.sentieri.push(datiSentiero);
  this.esperienza.kmTotali         += datiSentiero.km         ?? 0;
  this.esperienza.dislivelloTotale += datiSentiero.dislivello ?? 0;
  this.aggiornaLivelloPratico();
  this.aggiornaLivelloComplessivo();
  return this.save();
};

/**
 * Registra il completamento di un quiz e aggiorna il livello teorico.
 *
 * @param {{ quizId, punteggio }} datiQuiz
 */
utenteSchema.methods.aggiungiQuiz = async function (datiQuiz) {
  this.esperienza.quizCompletati.push(datiQuiz);
  // Aggiunge punti proporzionali al punteggio (max 10 punti per quiz)
  this.esperienza.puntiQuiz += Math.round((datiQuiz.punteggio / 100) * 10);
  this.aggiornaLivelloTeorico();
  this.aggiornaLivelloComplessivo();
  return this.save();
};

/**
 * Ricalcola livelloPratico in base a km totali e dislivello accumulato.
 *
 * Soglie (indicative, modificabili):
 *   1 → < 20 km  o < 500m D+
 *   2 → 20 km    o 500m D+
 *   3 → 60 km    o 1500m D+
 *   4 → 150 km   o 4000m D+
 *   5 → 300 km   o 8000m D+
 */
utenteSchema.methods.aggiornaLivelloPratico = function () {
  const km  = this.esperienza.kmTotali;
  const d   = this.esperienza.dislivelloTotale;
  const punteggio = Math.max(
    punteggioPerSoglie(km,  [0, 20,  60,  150, 300]),
    punteggioPerSoglie(d,   [0, 500, 1500, 4000, 8000])
  );
  this.esperienza.livelloPratico = punteggio;
};

/**
 * Ricalcola livelloTeorico in base ai puntiQuiz accumulati.
 *
 * Soglie:
 *   1 → 0  punti
 *   2 → 15 punti  (~2 quiz perfetti)
 *   3 → 40 punti
 *   4 → 80 punti
 *   5 → 130 punti
 */
utenteSchema.methods.aggiornaLivelloTeorico = function () {
  const punti = this.esperienza.puntiQuiz;
  this.esperienza.livelloTeorico = punteggioPerSoglie(punti, [0, 15, 40, 80, 130]);
};

/**
 * Ricalcola livelloComplessivo come media pesata:
 * 70% pratico + 30% teorico, arrotondato e limitato a [1, 5].
 */
utenteSchema.methods.aggiornaLivelloComplessivo = function () {
  const pratico  = this.esperienza.livelloPratico;
  const teorico  = this.esperienza.livelloTeorico;
  const media    = (pratico * 0.7) + (teorico * 0.3);
  this.esperienza.livelloComplessivo = Math.min(5, Math.max(1, Math.round(media)));
};

// ─── Helper privato (fuori dallo schema, non esposto) ───────────────────────
/**
 * Restituisce il livello (1-5) in base al valore e a un array di 5 soglie.
 * @param {number} valore
 * @param {number[]} soglie - array di 5 valori crescenti (soglia per livello 1..5)
 */
function punteggioPerSoglie(valore, soglie) {
  for (let i = soglie.length - 1; i >= 0; i--) {
    if (valore >= soglie[i]) return i + 1;
  }
  return 1;
}

module.exports = mongoose.model('Utente', utenteSchema);