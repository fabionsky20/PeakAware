/**
 * @file equipment-advisor.ts
 * @description Suggerisce l'attrezzatura consigliata in base alle caratteristiche del sentiero.
 * Funzione pura, indipendente da Angular.
 */

export interface SuggerimentoAttrezzatura {
  categoria: string;
  icona: string;
  items: { nome: string; obbligatorio: boolean }[];
}

export function suggerisciAttrezzatura(
  caiScale:   string | undefined,
  lunghezza:  number | undefined,
  dislivello: number | undefined
): SuggerimentoAttrezzatura[] {

  const scala   = caiScale?.toUpperCase()?.trim() ?? 'T';
  const km      = lunghezza  ?? 0;
  const dPlus   = dislivello ?? 0;
  const ferrata = scala === 'EEA' || scala === 'F' || scala === 'EEA:F' || scala === 'EEA:PD';

  // ── FERRATA: lista dedicata, logica completamente separata ──────────────
  if (ferrata) {
    return [
      {
        categoria: 'Attrezzatura tecnica obbligatoria',
        icona: '⛏️',
        items: [
          { nome: 'Casco da ferrata omologato',             obbligatorio: true },
          { nome: 'Imbrago da ferrata (con cosciali)',      obbligatorio: true },
          { nome: 'Dissipatore a Y (longe) con moschettoni', obbligatorio: true },
          { nome: 'Guanti da ferrata (proteggono le mani)', obbligatorio: true },
          { nome: 'Scarponi con suola Vibram rigida',       obbligatorio: true },
        ]
      },
      {
        categoria: 'Abbigliamento',
        icona: '👕',
        items: [
          { nome: 'Pantaloni elasticizzati (libertà di movimento)', obbligatorio: true },
          { nome: 'T-shirt tecnica traspirante',                    obbligatorio: true },
          { nome: 'Giacca antivento compatta (da mettere nello zaino)', obbligatorio: false },
          // Sconsigliato zaino grande: ingombrante sulle pareti
          { nome: 'Evita giacche voluminose o zaini > 20L',         obbligatorio: false },
        ]
      },
      {
        categoria: 'Zaino compatto (max 15-20L)',
        icona: '🎒',
        items: [
          { nome: 'Zaino slim aderente alla schiena (max 20L)',  obbligatorio: true },
          { nome: 'Acqua 1-1.5L (borraccia compatta)',           obbligatorio: true },
          { nome: 'Snack energetici tascabili',                  obbligatorio: true },
          // Cose ingombranti sconsigliate
          { nome: 'Evita bastoncini (inutilizzabili in parete)', obbligatorio: false },
          { nome: 'Evita thermos grandi o pranzi al sacco',      obbligatorio: false },
        ]
      },
      {
        categoria: 'Sicurezza',
        icona: '🧯',
        items: [
          { nome: 'Telefono carico con traccia offline',  obbligatorio: true },
          { nome: 'Kit primo soccorso compatto',          obbligatorio: true },
          { nome: 'Fischietto di emergenza',              obbligatorio: true },
          { nome: 'Coperta di emergenza (leggera)',       obbligatorio: false },
        ]
      }
    ];
  }

  // ── SENTIERI NORMALI (T, E, EE) ─────────────────────────────────────────
  const lunga       = km    > 12;
  const impegnativa = dPlus > 600;
  const livelloAlto = scala === 'EE';

  return [
    {
      categoria: 'Abbigliamento',
      icona: '👕',
      items: [
        { nome: livelloAlto || impegnativa
            ? 'Scarponi da trekking con caviglia alta'
            : 'Scarpe da trekking o trail running',          obbligatorio: true },
        { nome: 'Calzini tecnici',                           obbligatorio: true },
        { nome: 'Pantaloni convertibili',                    obbligatorio: lunga || impegnativa },
        { nome: 'Strato termico (pile o softshell)',         obbligatorio: impegnativa || livelloAlto },
        { nome: 'Giacca antipioggia/antivento',              obbligatorio: lunga || livelloAlto },
        { nome: 'Cappello da sole / berretto',               obbligatorio: true },
        { nome: 'Guanti',                                    obbligatorio: livelloAlto },
      ]
    },
    {
      categoria: 'Zaino e rifornimenti',
      icona: '🎒',
      items: [
        { nome: lunga ? 'Zaino 25-35L' : 'Zaino 15-20L',   obbligatorio: true },
        { nome: lunga ? 'Acqua 2L+' : 'Acqua 1.5L',        obbligatorio: true },
        { nome: 'Snack energetici / barrette',              obbligatorio: lunga || impegnativa },
        { nome: 'Pranzo al sacco',                          obbligatorio: lunga },
        { nome: 'Thermos con bevanda calda',                obbligatorio: livelloAlto },
      ]
    },
    {
      categoria: 'Sicurezza e navigazione',
      icona: '🧯',
      items: [
        { nome: 'Carta del sentiero o app offline (es. Komoot)', obbligatorio: true },
        { nome: 'Powerbank per il telefono',                     obbligatorio: lunga },
        { nome: 'Kit primo soccorso',                            obbligatorio: lunga || livelloAlto },
        { nome: 'Fischietto di emergenza',                       obbligatorio: livelloAlto },
        { nome: 'Torcia / frontalino',                           obbligatorio: lunga || livelloAlto },
        { nome: 'Coperta di emergenza',                          obbligatorio: livelloAlto },
        { nome: 'Bastoncini da trekking',                        obbligatorio: impegnativa || lunga },
      ]
    },
    ...(livelloAlto ? [{
      categoria: 'Attrezzatura tecnica (EE)',
      icona: '🧗',
      items: [
        { nome: 'Ghette (in caso di neve o fango)',         obbligatorio: false },
        { nome: 'Ramponi leggeri (stagionale)',             obbligatorio: false },
        { nome: 'Corda ausiliaria 5mm × 3m',               obbligatorio: false },
      ]
    }] : [])
  ];
}