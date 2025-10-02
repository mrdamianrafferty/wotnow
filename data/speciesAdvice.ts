import rawSpeciesAdvice from './speciesAdviceData.json';

export type SpeciesFishingContext = 'shore' | 'boat';

export interface SpeciesAdviceContextData {
  regions: string;
  bestTime: string;
  tideSensitivity: string;
  favouriteBaits: string;
  naturalDiet: string;
  temperature: string;
  weather: string;
  distance: string;
  edibility: number | null;
  restrictions: string;
  authority: string;
}

interface RawSpeciesAdviceEntry {
  name: string;
  normalized: string;
  contexts: Partial<Record<SpeciesFishingContext, SpeciesAdviceContextData>>;
  conservation: string;
  funFact: string;
}

export interface SpeciesAdviceResult {
  species: string;
  context: 'shore' | 'boat' | 'both';
  detail: SpeciesAdviceContextData;
  alternate?: {
    context: SpeciesFishingContext;
    detail: SpeciesAdviceContextData;
  };
  contextsAvailable: SpeciesFishingContext[];
  conservation: string;
  funFact: string;
}

const SPECIES_ADVICE_ENTRIES = (rawSpeciesAdvice as RawSpeciesAdviceEntry[]).map((entry) => ({
  ...entry,
  normalized: normalizeName(entry.normalized || entry.name),
}));

const SPECIES_ADVICE_MAP = new Map<string, RawSpeciesAdviceEntry>();

for (const entry of SPECIES_ADVICE_ENTRIES) {
  SPECIES_ADVICE_MAP.set(entry.normalized, entry);
}

function normalizeName(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const NAME_ALIASES: Record<string, string> = {
  'atlantic-cod': 'cod',
  'atlantic-herring': 'herring',
  'atlantic-mackerel': 'mackerel',
  'atlantic-salmon': 'sea-trout',
  'ballan-wrasse': 'ballan-wrasse',
  'black-seabream': 'black-seabream',
  'brill': 'brill',
  'common-cuttlefish': 'common-cuttlefish',
  'common-ling': 'common-ling',
  'common-octopus': 'common-octopus',
  'common-squid': 'common-squid',
  'conger-eel': 'conger-eel',
  'cuckoo-wrasse': 'cuckoo-wrasse',
  'dab': 'dab',
  'dentex': 'dentex',
  'dover-sole': 'dover-sole',
  'european-plaice': 'plaice',
  'flounder': 'flounder',
  'garfish': 'garfish-needlefish',
  'garfish-needlefish': 'garfish-needlefish',
  'gilthead-seabream': 'sea-bream-dorada',
  'greater-amberjack': 'greater-amberjack',
  'greater-weever': 'greater-weever',
  'grey-mullet': 'grey-mullet',
  'flathead-grey-mullet': 'flathead-grey-mullet',
  'horse-mackerel': 'horse-mackerel',
  'haddock': 'haddock',
  'herring': 'herring',
  'john-dory': 'john-dory',
  'little-tunny': 'little-tunny',
  'mackerel': 'mackerel',
  'megrim': 'megrim',
  'parrotfish': 'parrotfish',
  'plaice': 'plaice',
  'pollack': 'pollack',
  'pollock': 'pollack',
  'red-mullet': 'red-mullet',
  'red-seabream': 'red-seabream',
  'saithe': 'saithe-pollock',
  'saithe-pollock': 'saithe-pollock',
  'sand-eel': 'sand-eel',
  'sardine': 'sardine',
  'sea-bass': 'sea-bass',
  'sea-bream': 'sea-bream-dorada',
  'sea-bream-dorada': 'sea-bream-dorada',
  'sea-trout': 'sea-trout',
  'small-spotted-catshark': 'small-spotted-catshark',
  'spotted-bass': 'spotted-bass',
  'sprat': 'sprat',
  'thornback-ray': 'thornback-ray',
  'tub-gurnard': 'tub-gurnard',
  'turbot': 'turbot',
  'whiting': 'whiting',
  'wrasse': 'wrasse-various',
  'wrasse-various': 'wrasse-various',
  'greater-amber-jack': 'greater-amberjack',
};

const SPECIES_CODE_ALIASES: Record<string, string> = {
  AMB: 'greater-amberjack',
  BBR: 'black-seabream',
  BRI: 'brill',
  BSB: 'sea-bream-dorada',
  COD: 'cod',
  CON: 'conger-eel',
  CUC: 'cuckoo-wrasse',
  CUT: 'common-cuttlefish',
  DAB: 'dab',
  DEN: 'dentex',
  DOG: 'small-spotted-catshark',
  FLO: 'flounder',
  GAR: 'garfish-needlefish',
  GMU: 'grey-mullet',
  GUR: 'tub-gurnard',
  HAD: 'haddock',
  HER: 'herring',
  HOM: 'horse-mackerel',
  JDO: 'john-dory',
  LIN: 'common-ling',
  LIT: 'little-tunny',
  MAC: 'mackerel',
  MEG: 'megrim',
  MUL: 'flathead-grey-mullet',
  OCT: 'common-octopus',
  PLE: 'plaice',
  POL: 'pollack',
  RMU: 'red-mullet',
  SAI: 'saithe-pollock',
  SAN: 'sand-eel',
  SAR: 'sardine',
  SBA: 'sea-bass',
  SBR: 'sea-bream-dorada',
  SER: 'spotted-bass',
  SOL: 'dover-sole',
  SPA: 'parrotfish',
  SPR: 'sprat',
  SQU: 'common-squid',
  STR: 'sea-trout',
  THO: 'thornback-ray',
  TUR: 'turbot',
  WEE: 'greater-weever',
  WHI: 'whiting',
  WRA: 'wrasse-various',
};

function resolveEntryKey(commonName?: string | null, speciesCode?: string | null): string | null {
  if (speciesCode) {
    const normalisedCode = speciesCode.trim().toUpperCase();
    const byCode = SPECIES_CODE_ALIASES[normalisedCode];
    if (byCode && SPECIES_ADVICE_MAP.has(byCode)) {
      return byCode;
    }
  }

  const normalisedName = normalizeName(commonName);
  if (normalisedName) {
    if (SPECIES_ADVICE_MAP.has(normalisedName)) {
      return normalisedName;
    }
    const alias = NAME_ALIASES[normalisedName];
    if (alias && SPECIES_ADVICE_MAP.has(alias)) {
      return alias;
    }
  }

  return null;
}

export function getSpeciesAdvice(commonName?: string | null, speciesCode?: string | null): SpeciesAdviceResult | null {
  const key = resolveEntryKey(commonName, speciesCode);
  if (!key) {
    return null;
  }

  const entry = SPECIES_ADVICE_MAP.get(key);
  if (!entry) {
    return null;
  }

  const contexts = entry.contexts ?? {};
  const shore = contexts.shore;
  const boat = contexts.boat;

  const context: SpeciesAdviceResult['context'] = shore && boat ? 'both' : shore ? 'shore' : boat ? 'boat' : 'shore';
  const detail = shore ?? boat ?? Object.values(contexts)[0];

  if (!detail) {
    return null;
  }

  const contextsAvailable = (Object.keys(contexts) as SpeciesFishingContext[]).filter((value) => Boolean(contexts[value]));

  let alternate: SpeciesAdviceResult['alternate'];
  if (shore && boat) {
    const primaryContext: SpeciesFishingContext = detail === shore ? 'shore' : 'boat';
    const secondaryContext: SpeciesFishingContext = primaryContext === 'shore' ? 'boat' : 'shore';
    const secondaryDetail = primaryContext === 'shore' ? boat : shore;
    if (secondaryDetail) {
      alternate = {
        context: secondaryContext,
        detail: secondaryDetail,
      };
    }
  }

  return {
    species: entry.name,
    context,
    detail,
    alternate,
    contextsAvailable,
    conservation: entry.conservation,
    funFact: entry.funFact,
  };
}
