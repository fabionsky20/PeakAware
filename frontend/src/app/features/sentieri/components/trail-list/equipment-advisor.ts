/**
 * @file equipment-advisor.ts
 * @description Suggerisce l'attrezzatura consigliata.
 * Espone una configurazione globale editabile dall'Admin.
 */

export interface SuggerimentoAttrezzatura {
  categoria: string;
  icona: string;
  items: { nome: string; obbligatorio: boolean }[];
}

// ── CONFIGURAZIONE DINAMICA MODIFICABILE DALL'ADMIN ─────────────
export const EquipConfig = {
  soglie: {
    lungaKm: 12,
    impegnativaDPlus: 600
  },
  liste: {
    ferrataAttrezzatura: [
      { nome: 'Casco da ferrata omologato',             obbligatorio: true },
      { nome: 'Imbrago da ferrata (con cosciali)',      obbligatorio: true },
      { nome: 'Dissipatore a Y (longe) con moschettoni', obbligatorio: true },
      { nome: 'Guanti da ferrata (proteggono le mani)', obbligatorio: true },
      { nome: 'Scarponi con suola Vibram rigida',       obbligatorio: true },
    ],
    ferrataAbbigliamento: [
      { nome: 'Pantaloni elasticizzati (libertà di movimento)', obbligatorio: true },
      { nome: 'T-shirt tecnica traspirante',                    obbligatorio: true },
      { nome: 'Giacca antivento compatta (da mettere nello zaino)', obbligatorio: false },
      { nome: 'Evita giacche voluminose o zaini > 20L',         obbligatorio: false },
    ],
    ferrataZaino: [
      { nome: 'Zaino slim aderente alla schiena (max 20L)',  obbligatorio: true },
      { nome: 'Acqua 1-1.5L (borraccia compatta)',           obbligatorio: true },
      { nome: 'Snack energetici tascabili',                  obbligatorio: true },
      { nome: 'Evita bastoncini (inutilizzabili in parete)', obbligatorio: false },
    ],
    sicurezzaBase: [
      { nome: 'Telefono carico con traccia offline',  obbligatorio: true },
      { nome: 'Kit primo soccorso compatto',          obbligatorio: true },
      { nome: 'Fischietto di emergenza',              obbligatorio: true },
      { nome: 'Coperta di emergenza (leggera)',       obbligatorio: false },
    ]
  }
};

export function suggerisciAttrezzatura(
  caiScale:   string | undefined,
  lunghezza:  number | undefined,
  dislivello: number | undefined
): SuggerimentoAttrezzatura[] {

  const scala   = caiScale?.toUpperCase()?.trim() ?? 'T';
  const km      = lunghezza  ?? 0;
  const dPlus   = dislivello ?? 0;
  const ferrata = scala === 'EEA' || scala === 'F' || scala === 'EEA:F' || scala === 'EEA:PD';

  if (ferrata) {
    return [
      { categoria: 'Attrezzatura tecnica obbligatoria', icona: '⛏️', items: EquipConfig.liste.ferrataAttrezzatura },
      { categoria: 'Abbigliamento', icona: '👕', items: EquipConfig.liste.ferrataAbbigliamento },
      { categoria: 'Zaino compatto (max 15-20L)', icona: '🎒', items: EquipConfig.liste.ferrataZaino },
      { categoria: 'Sicurezza', icona: '🧯', items: EquipConfig.liste.sicurezzaBase }
    ];
  }

  // Applica le soglie dinamiche stabilite dall'Admin
  const lunga       = km    > EquipConfig.soglie.lungaKm;
  const impegnativa = dPlus > EquipConfig.soglie.impegnativaDPlus;
  const livelloAlto = scala === 'EE';

  return [
    {
      categoria: 'Abbigliamento',
      icona: '👕',
      items: [
        { nome: livelloAlto || impegnativa ? 'Scarponi da trekking con caviglia alta' : 'Scarpe da trekking o trail running', obbligatorio: true },
        { nome: 'Calzini tecnici', obbligatorio: true },
        { nome: 'Pantaloni convertibili', obbligatorio: lunga || impegnativa },
        { nome: 'Strato termico (pile o softshell)', obbligatorio: impegnativa || livelloAlto },
        { nome: 'Giacca antipioggia/antivento', obbligatorio: lunga || livelloAlto },
        { nome: 'Cappello da sole / berretto', obbligatorio: true },
        { nome: 'Guanti', obbligatorio: livelloAlto },
      ]
    },
    {
      categoria: 'Zaino e rifornimenti',
      icona: '🎒',
      items: [
        { nome: lunga ? 'Zaino 25-35L' : 'Zaino 15-20L', obbligatorio: true },
        { nome: lunga ? 'Acqua 2L+' : 'Acqua 1.5L', obbligatorio: true },
        { nome: 'Snack energetici / barrette', obbligatorio: lunga || impegnativa },
        { nome: 'Pranzo al sacco', obbligatorio: lunga },
        { nome: 'Thermos con bevanda calda', obbligatorio: livelloAlto },
      ]
    },
    {
      categoria: 'Sicurezza e navigazione',
      icona: '🧯',
      items: [
        { nome: 'Carta del sentiero o app offline', obbligatorio: true },
        { nome: 'Powerbank per il telefono', obbligatorio: lunga },
        { nome: 'Kit primo soccorso', obbligatorio: lunga || livelloAlto },
        { nome: 'Fischietto di emergenza', obbligatorio: livelloAlto },
        { nome: 'Torcia / frontalino', obbligatorio: lunga || livelloAlto },
        { nome: 'Coperta di emergenza', obbligatorio: livelloAlto },
        { nome: 'Bastoncini da trekking', obbligatorio: impegnativa || lunga },
      ]
    },
    ...(livelloAlto ? [{
      categoria: 'Attrezzatura tecnica (EE)',
      icona: '🧗',
      items: [
        { nome: 'Ghette (in caso di neve o fango)', obbligatorio: false },
        { nome: 'Ramponi leggeri (stagionale)', obbligatorio: false },
        { nome: 'Corda ausiliaria 5mm × 3m', obbligatorio: false },
      ]
    }] : [])
  ];
}