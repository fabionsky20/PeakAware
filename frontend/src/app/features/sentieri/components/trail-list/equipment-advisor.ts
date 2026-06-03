/**
 * @file equipment-advisor.ts
 * @description Suggerisce l'attrezzatura consigliata.
 * Espone una configurazione globale editabile dall'Admin e persistita nel DB.
 */

export interface EquipItem {
  nome: string;
  obbligatorio: boolean;
}

export interface SuggerimentoAttrezzatura {
  categoria: string;
  icona: string;
  items: EquipItem[];
}

// ── CONFIGURAZIONE DINAMICA MODIFICABILE DALL'ADMIN ─────────────────────────
export const EquipConfig = {
  soglie: {
    lungaKm: 12,
    impegnativaDPlus: 600
  },

  /**
   * Attrezzatura di base per ogni livello CAI.
   * Viene caricata dal DB al boot e sovrascritta dall'Admin tramite la modale.
   * La funzione suggerisciAttrezzatura() usa questi dati come base,
   * aggiungendo eventuali item dinamici in base alle soglie (km, dplus).
   */
  attrezzaturaPerLivello: {
    T: [
      {
        categoria: 'Abbigliamento',
        icona: '👕',
        items: [
          { nome: 'Scarpe da trekking o trail running', obbligatorio: true },
          { nome: 'Calzini tecnici', obbligatorio: true },
          { nome: 'Cappello da sole', obbligatorio: true },
          { nome: 'Giacca antipioggia leggera', obbligatorio: false },
        ]
      },
      {
        categoria: 'Zaino e rifornimenti',
        icona: '🎒',
        items: [
          { nome: 'Zaino 15-20L', obbligatorio: true },
          { nome: 'Acqua 1.5L', obbligatorio: true },
          { nome: 'Snack energetici', obbligatorio: false },
        ]
      },
      {
        categoria: 'Sicurezza e navigazione',
        icona: '🧯',
        items: [
          { nome: 'Carta del sentiero o app offline', obbligatorio: true },
          { nome: 'Kit primo soccorso', obbligatorio: false },
        ]
      }
    ] as SuggerimentoAttrezzatura[],

    E: [
      {
        categoria: 'Abbigliamento',
        icona: '👕',
        items: [
          { nome: 'Scarpe da trekking con buona suola', obbligatorio: true },
          { nome: 'Calzini tecnici', obbligatorio: true },
          { nome: 'Pantaloni convertibili', obbligatorio: true },
          { nome: 'Strato termico (pile leggero)', obbligatorio: false },
          { nome: 'Giacca antipioggia/antivento', obbligatorio: true },
          { nome: 'Cappello da sole / berretto', obbligatorio: true },
        ]
      },
      {
        categoria: 'Zaino e rifornimenti',
        icona: '🎒',
        items: [
          { nome: 'Zaino 20-30L', obbligatorio: true },
          { nome: 'Acqua 2L', obbligatorio: true },
          { nome: 'Snack energetici / barrette', obbligatorio: true },
          { nome: 'Pranzo al sacco', obbligatorio: false },
        ]
      },
      {
        categoria: 'Sicurezza e navigazione',
        icona: '🧯',
        items: [
          { nome: 'Carta del sentiero o app offline', obbligatorio: true },
          { nome: 'Kit primo soccorso', obbligatorio: true },
          { nome: 'Fischietto di emergenza', obbligatorio: false },
          { nome: 'Bastoncini da trekking', obbligatorio: false },
        ]
      }
    ] as SuggerimentoAttrezzatura[],

    EE: [
      {
        categoria: 'Abbigliamento',
        icona: '👕',
        items: [
          { nome: 'Scarponi da trekking con caviglia alta', obbligatorio: true },
          { nome: 'Calzini tecnici', obbligatorio: true },
          { nome: 'Pantaloni convertibili', obbligatorio: true },
          { nome: 'Strato termico (pile o softshell)', obbligatorio: true },
          { nome: 'Giacca antipioggia/antivento', obbligatorio: true },
          { nome: 'Cappello da sole / berretto', obbligatorio: true },
          { nome: 'Guanti', obbligatorio: true },
        ]
      },
      {
        categoria: 'Zaino e rifornimenti',
        icona: '🎒',
        items: [
          { nome: 'Zaino 25-35L', obbligatorio: true },
          { nome: 'Acqua 2L+', obbligatorio: true },
          { nome: 'Snack energetici / barrette', obbligatorio: true },
          { nome: 'Pranzo al sacco', obbligatorio: true },
          { nome: 'Thermos con bevanda calda', obbligatorio: true },
        ]
      },
      {
        categoria: 'Sicurezza e navigazione',
        icona: '🧯',
        items: [
          { nome: 'Carta del sentiero o app offline', obbligatorio: true },
          { nome: 'Powerbank per il telefono', obbligatorio: true },
          { nome: 'Kit primo soccorso', obbligatorio: true },
          { nome: 'Fischietto di emergenza', obbligatorio: true },
          { nome: 'Torcia / frontalino', obbligatorio: true },
          { nome: 'Coperta di emergenza', obbligatorio: true },
          { nome: 'Bastoncini da trekking', obbligatorio: true },
        ]
      },
      {
        categoria: 'Attrezzatura tecnica (EE)',
        icona: '🧗',
        items: [
          { nome: 'Ghette (in caso di neve o fango)', obbligatorio: false },
          { nome: 'Ramponi leggeri (stagionale)', obbligatorio: false },
          { nome: 'Corda ausiliaria 5mm × 3m', obbligatorio: false },
        ]
      }
    ] as SuggerimentoAttrezzatura[],

    EEA: [
      {
        categoria: 'Attrezzatura tecnica obbligatoria',
        icona: '⛏️',
        items: [
          { nome: 'Casco da ferrata omologato', obbligatorio: true },
          { nome: 'Imbrago da ferrata (con cosciali)', obbligatorio: true },
          { nome: 'Dissipatore a Y (longe) con moschettoni', obbligatorio: true },
          { nome: 'Guanti da ferrata (proteggono le mani)', obbligatorio: true },
          { nome: 'Scarponi con suola Vibram rigida', obbligatorio: true },
        ]
      },
      {
        categoria: 'Abbigliamento',
        icona: '👕',
        items: [
          { nome: 'Pantaloni elasticizzati (libertà di movimento)', obbligatorio: true },
          { nome: 'T-shirt tecnica traspirante', obbligatorio: true },
          { nome: 'Giacca antivento compatta (nello zaino)', obbligatorio: false },
          { nome: 'Evita giacche voluminose o zaini > 20L', obbligatorio: false },
        ]
      },
      {
        categoria: 'Zaino compatto (max 15-20L)',
        icona: '🎒',
        items: [
          { nome: 'Zaino slim aderente alla schiena (max 20L)', obbligatorio: true },
          { nome: 'Acqua 1-1.5L (borraccia compatta)', obbligatorio: true },
          { nome: 'Snack energetici tascabili', obbligatorio: true },
          { nome: 'Evita bastoncini (inutilizzabili in parete)', obbligatorio: false },
        ]
      },
      {
        categoria: 'Sicurezza',
        icona: '🧯',
        items: [
          { nome: 'Telefono carico con traccia offline', obbligatorio: true },
          { nome: 'Kit primo soccorso compatto', obbligatorio: true },
          { nome: 'Fischietto di emergenza', obbligatorio: true },
          { nome: 'Coperta di emergenza (leggera)', obbligatorio: false },
        ]
      }
    ] as SuggerimentoAttrezzatura[]
  } as Record<string, SuggerimentoAttrezzatura[]>
};

// ── FUNZIONE PRINCIPALE ──────────────────────────────────────────────────────
/**
 * Restituisce l'attrezzatura consigliata per il sentiero dato.
 * Usa la lista base del livello CAI da EquipConfig.attrezzaturaPerLivello,
 * che viene aggiornata dinamicamente dal DB tramite ngOnInit della sidebar.
 */
export function suggerisciAttrezzatura(
  caiScale:   string | undefined,
  lunghezza:  number | undefined,
  dislivello: number | undefined
): SuggerimentoAttrezzatura[] {

  const scala = caiScale?.toUpperCase()?.trim() ?? 'T';
  const km    = lunghezza  ?? 0;
  const dPlus = dislivello ?? 0;

  // Normalizza le varianti di ferrata al livello EEA
  const livelloNorm =
    scala === 'F' || scala === 'EEA:F' || scala === 'EEA:PD' ? 'EEA' :
    ['T', 'E', 'EE', 'EEA'].includes(scala) ? scala : 'T';

  // Deep-copy per non mutare la config globale
  const base: SuggerimentoAttrezzatura[] = JSON.parse(
    JSON.stringify(EquipConfig.attrezzaturaPerLivello[livelloNorm] ?? EquipConfig.attrezzaturaPerLivello['T'])
  );

  // Per ferrata non aggiungiamo item dinamici (lista fissa)
  if (livelloNorm === 'EEA') return base;

  // ── Arricchimento dinamico basato sulle soglie ──
  const lunga       = km    > EquipConfig.soglie.lungaKm;
  const impegnativa = dPlus > EquipConfig.soglie.impegnativaDPlus;

  // Cerca la categoria "Zaino" e aggiorna la dimensione consigliata
  const catZaino = base.find(c => c.icona === '🎒');
  if (catZaino) {
    const voceZaino = catZaino.items.find(i => i.nome.toLowerCase().includes('zaino'));
    if (voceZaino && lunga) voceZaino.nome = 'Zaino 25-35L';

    const voceAcqua = catZaino.items.find(i => i.nome.toLowerCase().includes('acqua'));
    if (voceAcqua && lunga) voceAcqua.nome = 'Acqua 2L+';

    if (lunga && !catZaino.items.some(i => i.nome.toLowerCase().includes('pranzo'))) {
      catZaino.items.push({ nome: 'Pranzo al sacco', obbligatorio: true });
    }
    if (impegnativa && !catZaino.items.some(i => i.nome.toLowerCase().includes('thermos'))) {
      catZaino.items.push({ nome: 'Thermos con bevanda calda', obbligatorio: false });
    }
  }

  // Cerca la categoria "Sicurezza" e aggiungi item extra se percorso lungo/impegnativo
  const catSicurezza = base.find(c => c.icona === '🧯');
  if (catSicurezza) {
    if (lunga && !catSicurezza.items.some(i => i.nome.toLowerCase().includes('powerbank'))) {
      catSicurezza.items.push({ nome: 'Powerbank per il telefono', obbligatorio: true });
    }
    if ((lunga || impegnativa) && !catSicurezza.items.some(i => i.nome.toLowerCase().includes('torcia'))) {
      catSicurezza.items.push({ nome: 'Torcia / frontalino', obbligatorio: false });
    }
  }

  return base;
}