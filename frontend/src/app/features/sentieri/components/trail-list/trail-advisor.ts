/**
 * @file trail-advisor.ts
 * @description Logica di valutazione compatibilità sentiero-utente.
 * Confronta la scala di difficoltà CAI del sentiero con il livello di esperienza
 * dell'utente e restituisce un consiglio (consigliato, fattibile, sconsigliato,
 * ferrata, sconosciuto) con titolo, messaggio e icona.
 * La configurazione TrailConfig (soglie CAI e avvertenze) è modificabile
 * dagli admin tramite l'interfaccia di configurazione e viene applicata dinamicamente.
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

// ── CONFIGURAZIONE DINAMICA MODIFICABILE DALL'ADMIN ─────────────
export const TrailConfig = {
  requisitiCai: {
    'T':   1,
    'E':   2,
    'EE':  3,
    'EEA': 5,
  } as Record<string, number>,
  
  avvertenze: {
    lunghezzaKm: 15,
    dislivelloM: 800
  }
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
      messaggio: 'Richiede attrezzatura specifica (casco, imbrago, dissipatore). Non affrontarlo senza esperienza.'
    };
  }

  // Usa i requisiti dalla configurazione modificabile
  const livReq = scala ? TrailConfig.requisitiCai[scala] : null;

  if (!livReq) {
    return {
      livello:   'sconosciuto',
      titolo:    'Difficoltà non classificata',
      icona:     '❓',
      messaggio: 'Non ci sono informazioni sulla difficoltà. Verifica prima di partire.'
    };
  }

  const livUtente = utente.livelloEsperienzaMontagna;

  if (livUtente < livReq) {
    return {
      livello:   'sconsigliato',
      titolo:    'Non consigliato per il tuo profilo',
      icona:     '⚠️',
      messaggio: `Questo sentiero richiede livello ${livReq}/5, il tuo è ${livUtente}/5. Allenati su percorsi più semplici.`
    };
  }

  // Avvertenze generate dinamicamente dalle soglie dell'Admin
  const avvertenze: string[] = [];
  if ((lunghezza  ?? 0) > TrailConfig.avvertenze.lunghezzaKm)  avvertenze.push(`percorso lungo (>${TrailConfig.avvertenze.lunghezzaKm} km): porta acqua`);
  if ((dislivello ?? 0) > TrailConfig.avvertenze.dislivelloM) avvertenze.push(`dislivello elevato (${dislivello} m D+): calcola i tempi`);

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