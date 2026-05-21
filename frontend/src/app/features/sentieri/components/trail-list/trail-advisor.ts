/**
 * Logica di valutazione compatibilità sentiero-utente.
 * Funzione pura, indipendente da Angular — usabile anche nei quiz.
 */

export interface UtenteSnapshot {
  livelloEsperienzaMontagna: number; // livelloComplessivo da Utente.esperienza (1-5)
}

export type ConsiglioDifficolta = 'consigliato' | 'fattibile' | 'sconsigliato' | 'ferrata' | 'sconosciuto';

export interface ConsiglioSentiero {
  livello:   ConsiglioDifficolta;
  titolo:    string;
  messaggio: string;
  icona:     string;
}

/**
 * Requisiti minimi di esperienza per ogni livello CAI.
 * T=1, E=2, EE=3, EEA=5
 */
const REQUISITI_CAI: Record<string, number> = {
  'T':   1,
  'E':   2,
  'EE':  3,
  'EEA': 5,
};

export function valutaCompatibilita(
  caiScale:    string | undefined,
  lunghezza:   number | undefined,
  dislivello:  number | undefined,
  utente:      UtenteSnapshot
): ConsiglioSentiero {

  const scala = caiScale?.toUpperCase()?.trim();

  if (scala === 'EEA' || scala === 'F') {
    return {
      livello:   'ferrata',
      titolo:    'Ferrata / Alpinistico',
      icona:     '⛏️',
      messaggio: 'Richiede attrezzatura specifica (casco, imbrago, dissipatore). ' +
                 'Non affrontarlo senza esperienza e equipaggiamento adeguati.'
    };
  }

  const livReq = scala ? REQUISITI_CAI[scala] : null;

  if (!livReq) {
    return {
      livello:   'sconosciuto',
      titolo:    'Difficoltà non classificata',
      icona:     '❓',
      messaggio: 'Non ci sono informazioni sulla difficoltà. Verifica su OSM o sul sito SAT prima di partire.'
    };
  }

  const livUtente = utente.livelloEsperienzaMontagna;

  if (livUtente < livReq) {
    return {
      livello:   'sconsigliato',
      titolo:    'Non consigliato per il tuo profilo',
      icona:     '⚠️',
      messaggio: `Questo sentiero richiede livello ${livReq}/5, ` +
                 `il tuo è ${livUtente}/5. ` +
                 'Allenati su sentieri più semplici per aumentare la tua esperienza.'
    };
  }

  // Utente adatto — avvertenze per percorsi impegnativi
  const avvertenze: string[] = [];
  if ((lunghezza  ?? 0) > 15)  avvertenze.push('percorso lungo (>15 km): parti presto e porta acqua a sufficienza');
  if ((dislivello ?? 0) > 800) avvertenze.push(`dislivello elevato (${dislivello} m D+): calcola bene i tempi`);

  if (avvertenze.length > 0) {
    return {
      livello:   'fattibile',
      titolo:    'Fattibile con attenzione',
      icona:     '🟡',
      messaggio: `Il tuo livello è adatto, ma attenzione: ${avvertenze.join('; ')}.`
    };
  }

  return {
    livello:   'consigliato',
    titolo:    'Adatto al tuo profilo',
    icona:     '✅',
    messaggio: `Sentiero adatto al tuo livello di esperienza (${livUtente}/5). Buona escursione!`
  };
}