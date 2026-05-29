/**
 * @file badgeService.js
 * @description Logica di sblocco badge per il sistema di progressione utente.
 * Viene chiamato dopo aggiungiSentiero() e aggiungiQuiz() nel controller.
 * 
 * Per aggiungere un nuovo badge:
 *  1. Aggiungi una condizione in REGOLE_BADGE
 *  2. Nessun'altra modifica necessaria
 */

// ─── Definizione badge ───────────────────────────────────────────────────────
/**
 * Ogni regola ha:
 *  - id:          identificativo univoco (salvato nel DB)
 *  - nome:        label leggibile
 *  - descrizione: mostrata all'utente quando viene sbloccato
 *  - icona:       emoji per la UI
 *  - controlla:   funzione pura (utente) => boolean
 */
const REGOLE_BADGE = [

  // ── Sentieri ──────────────────────────────────────────────────────────────
  {
    id: 'prima_escursione',
    nome: 'Prima escursione',
    descrizione: 'Hai registrato il tuo primo sentiero percorso!',
    icona: '🥾',
    controlla: (u) => u.esperienza.sentieri.length >= 1,
  },
  {
    id: 'esploratore',
    nome: 'Esploratore',
    descrizione: 'Hai percorso 10 sentieri diversi.',
    icona: '🗺️',
    controlla: (u) => u.esperienza.sentieri.length >= 10,
  },
  {
    id: 'km_50',
    nome: '50 km sulle gambe',
    descrizione: 'Hai accumulato 50 km totali sui sentieri.',
    icona: '📏',
    controlla: (u) => u.esperienza.kmTotali >= 50,
  },
  {
    id: 'km_100',
    nome: 'Centurione',
    descrizione: 'Hai accumulato 100 km totali sui sentieri.',
    icona: '💯',
    controlla: (u) => u.esperienza.kmTotali >= 100,
  },
  {
    id: 'dislivello_1000',
    nome: 'Mille metri sopra',
    descrizione: 'Hai accumulato 1000 m di dislivello positivo.',
    icona: '⛰️',
    controlla: (u) => u.esperienza.dislivelloTotale >= 1000,
  },
  {
    id: 'dislivello_5000',
    nome: 'Alpinista',
    descrizione: 'Hai accumulato 5000 m di dislivello positivo.',
    icona: '🏔️',
    controlla: (u) => u.esperienza.dislivelloTotale >= 5000,
  },

  // ── Quiz ──────────────────────────────────────────────────────────────────
  {
    id: 'primo_quiz',
    nome: 'Primo passo',
    descrizione: 'Hai completato il tuo primo quiz.',
    icona: '📚',
    controlla: (u) => u.esperienza.quizCompletati.length >= 1,
  },
  {
    id: 'quiz_maestro',
    nome: 'Maestro di montagna',
    descrizione: 'Hai completato 10 quiz con punteggio superiore all\'80%.',
    icona: '🎓',
    controlla: (u) =>
      u.esperienza.quizCompletati.filter(q => q.punteggio >= 80).length >= 10,
  },

  // ── Livello complessivo ───────────────────────────────────────────────────
  {
    id: 'livello_3',
    nome: 'Escursionista',
    descrizione: 'Hai raggiunto il livello esperienza 3.',
    icona: '🌿',
    controlla: (u) => u.esperienza.livelloComplessivo >= 3,
  },
  {
    id: 'livello_5',
    nome: 'Veterano della montagna',
    descrizione: 'Hai raggiunto il massimo livello di esperienza!',
    icona: '🦅',
    controlla: (u) => u.esperienza.livelloComplessivo >= 5,
  },
];

// ─── Funzione principale ─────────────────────────────────────────────────────
/**
 * Controlla quali badge l'utente ha sbloccato ma non ancora ricevuto,
 * li aggiunge al documento e restituisce i nuovi badge sbloccati.
 * NON chiama save() — lo fa il chiamante.
 *
 * @param {import('../models/Utente')} utente - Documento Mongoose utente
 * @returns {{ id, nome, descrizione, icona }[]} - Badge appena sbloccati
 */
function verificaBadge(utente) {
  const giaSbloccati = new Set(utente.badges.map(b => b.id));
  const nuovi = [];

  for (const regola of REGOLE_BADGE) {
    if (giaSbloccati.has(regola.id)) continue; // già ottenuto, salta

    if (regola.controlla(utente)) {
      utente.badges.push({ id: regola.id, sbloccatoIl: new Date() });
      nuovi.push({
        id:          regola.id,
        nome:        regola.nome,
        descrizione: regola.descrizione,
        icona:       regola.icona,
      });
    }
  }

  return nuovi;
}

/**
 * Restituisce la lista completa dei badge disponibili nel sistema
 * (utile per la pagina profilo: mostra badge ottenuti e quelli ancora da sbloccare).
 *
 * @returns {{ id, nome, descrizione, icona }[]}
 */
function getAllBadge() {
  return REGOLE_BADGE.map(({ id, nome, descrizione, icona }) => ({
    id, nome, descrizione, icona
  }));
}

module.exports = { verificaBadge, getAllBadge };