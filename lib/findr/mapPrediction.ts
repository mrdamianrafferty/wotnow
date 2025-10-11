import { SPECIES_IMAGE_MAP, type SpeciesImageInfo } from '../../data/speciesImageMap';
import { getFindrFishBio } from '../../data/findrFishBios';
import type { FishingPrediction } from '../../hooks/useFishingPredictions';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface CardImage {
  src: string;
  alt: string;
  mobile: string | null;
  thumb: string | null;
}

export type LocalizedSpeciesNames = Partial<Record<'fr' | 'es' | 'de' | 'it' | 'pt', string>>;

export interface SpeciesAdvice {
  type?: string;
  regions?: string;
  best_time?: string;
  tide_sensitivity?: string;
  favourite_baits_and_natural_diet?: string;
  effect_of_temperature?: string;
  effect_of_weather?: string;
  typical_distance_depth?: string;
  edibility_10?: string;
  restrictions_notes?: string;
  trusted_authority_rules?: string;
  conservation_status?: string;
  fun_fact?: string;
}

export interface CardData {
  id: string;
  speciesId?: string | null;
  commonName: string;
  scientificName?: string;
  confidence: number | null;
  summary?: string;
  rationale: string[];
  baitSuggestions: string[];
  tideTips: string[];
  statusNotes: string[];
  emoji: string;
  speciesCode?: string;
  image?: CardImage;
  playfulBio?: string;
  localizedNames?: LocalizedSpeciesNames;
  advice?: SpeciesAdvice[];
}

const SPECIES_IMAGES_BY_SLUG: Record<string, SpeciesImageInfo> = (() => {
  const lookup: Record<string, SpeciesImageInfo> = {};
  for (const info of Object.values(SPECIES_IMAGE_MAP)) {
    lookup[info.slug.toLowerCase()] = info;
    lookup[info.name.toLowerCase()] = info;
    if (info.scientificName) {
      lookup[info.scientificName.toLowerCase()] = info;
    }
  }
  return lookup;
})();

const SPECIES_EMOJI_MAP: Record<string, string> = {
  'atlantic cod': '🐟',
  cod: '🐟',
  'sea bass': '🐟',
  bass: '🐟',
  pollack: '🐟',
  haddock: '🐟',
  whiting: '🐟',
  'john dory': '🐠',
  turbot: '🐟',
  brill: '🐟',
  plaice: '🐟',
  flounder: '🐟',
  sole: '🐟',
  garfish: '🐠',
  herring: '🐟',
  mackerel: '🐟',
  'grey mullet': '🐟',
  'red mullet': '🐟',
  sprat: '🐟',
  sardine: '🐟',
  'sea trout': '🐟',
  'conger eel': '🪱',
  eel: '🪱',
  squid: '🦑',
  octopus: '🐙',
  cuttlefish: '🦑',
  'thornback ray': '🛸',
  ray: '🛸',
  weever: '⚠️',
  gurnard: '🐟',
  wrasse: '🐠',
  'horse mackerel': '🐟',
  ling: '🐟',
  megrim: '🐟',
  'sand eel': '🐟',
};

function getSpeciesEmoji(name?: string): string {
  if (!name) return '🐟';
  const normalized = name.trim().toLowerCase();
  if (SPECIES_EMOJI_MAP[normalized]) {
    return SPECIES_EMOJI_MAP[normalized];
  }
  const simplified = normalized.replace(/[^a-z]/g, ' ');
  const words = simplified.split(//).filter(Boolean);
  for (const word of words) {
    const trimmed = word.trim();
    if (SPECIES_EMOJI_MAP[trimmed]) {
      return SPECIES_EMOJI_MAP[trimmed];
    }
  }
  if (words.some((word) => word.includes('eel'))) return '🪱';
  if (words.some((word) => word.includes('squid') || word.includes('octopus') || word.includes('cuttle')))
    return '🦑';
  if (words.some((word) => word.includes('ray'))) return '🛸';
  if (words.some((word) => word.includes('shark'))) return '🦈';
  return '🐟';
}

function firstString(value: JsonValue | undefined): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = firstString(entry as JsonValue);
      if (parsed) return parsed;
    }
  }
  if (typeof value === 'object') {
    for (const entry of Object.values(value)) {
      const parsed = firstString(entry as JsonValue);
      if (parsed) return parsed;
    }
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function collectFromKeys(source: FishingPrediction, keys: string[]): string[] {
  const collected: string[] = [];
  for (const key of keys) {
    const raw = source[key];
    if (!raw) continue;
    if (typeof raw === 'string') {
      collected.push(raw);
      continue;
    }
    if (Array.isArray(raw)) {
      for (const entry of raw) {
        if (typeof entry === 'string') {
          collected.push(entry);
        } else if (entry && typeof entry === 'object') {
          const nested = firstString(entry as JsonValue);
          if (nested) collected.push(nested);
        }
      }
      continue;
    }
    if (typeof raw === 'object') {
      const nested = firstString(raw as JsonValue);
      if (nested) collected.push(nested);
    }
  }
  return collected;
}

function parseLocalizedSpeciesNames(value: JsonValue | undefined): LocalizedSpeciesNames | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const container = value as Record<string, JsonValue>;
  const languages: Array<keyof LocalizedSpeciesNames> = ['fr', 'es', 'de', 'it', 'pt'];
  const names: LocalizedSpeciesNames = {};

  for (const lang of languages) {
    const raw = container[lang] ?? container[lang.toUpperCase()];
    const parsed = firstString(raw);
    if (parsed) {
      names[lang] = parsed;
    }
  }

  return Object.keys(names).length > 0 ? names : undefined;
}

function extractNumber(value: JsonValue | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,-]/g, '');
    if (!cleaned) return null;
    const parsed = Number.parseFloat(cleaned.replace(/,/g, '.'));
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = extractNumber(entry as JsonValue);
      if (parsed != null) return parsed;
    }
  }
  if (typeof value === 'object') {
    for (const entry of Object.values(value)) {
      const parsed = extractNumber(entry as JsonValue);
      if (parsed != null) return parsed;
    }
  }
  return null;
}

function parseConfidence(prediction: FishingPrediction): number | null {
  const candidateKeys = [
    'confidence',
    'confidence_percent',
    'confidencePercentage',
    'confidence_score',
    'confidenceScore',
    'probability',
    'score',
  ];

  for (const key of candidateKeys) {
    const raw = extractNumber(prediction[key]);
    if (raw == null || Number.isNaN(raw)) continue;
    let value = raw;
    if (value > 0 && value <= 1) {
      value *= 100;
    }
    if (value < 0) continue;
    return Math.round(Math.min(value, 100));
  }
  return null;
}

function resolveSpeciesImage(
  speciesCode?: string | null,
  commonName?: string | null
): SpeciesImageInfo | undefined {
  if (speciesCode) {
    const normalized = speciesCode.trim().toUpperCase();
    if (normalized && SPECIES_IMAGE_MAP[normalized]) {
      return SPECIES_IMAGE_MAP[normalized];
    }
  }
  if (commonName) {
    const normalizedName = commonName.trim().toLowerCase();
    const slug = normalizedName.replace(/[^a-z0-9]+/g, '-');
    if (SPECIES_IMAGES_BY_SLUG[slug]) {
      return SPECIES_IMAGES_BY_SLUG[slug];
    }
    if (SPECIES_IMAGES_BY_SLUG[normalizedName]) {
      return SPECIES_IMAGES_BY_SLUG[normalizedName];
    }
  }
  return undefined;
}

export function mapPrediction(prediction: FishingPrediction, index: number): CardData | null {
  const speciesIdCandidate =
    firstString(prediction.species_id) ||
    firstString(prediction.speciesId) ||
    firstString(prediction.id) ||
    firstString(prediction.species_code);

  const speciesCodeCandidate =
    firstString(prediction.species_code) ||
    firstString(prediction.speciesCode) ||
    firstString(prediction.species_id) ||
    undefined;

  const speciesCode = speciesCodeCandidate ? speciesCodeCandidate.trim().toUpperCase() : undefined;
  const rawSpeciesId =
    speciesIdCandidate && typeof speciesIdCandidate === 'string'
      ? speciesIdCandidate.trim()
      : undefined;

  const commonName =
    firstString(prediction.species_common_name) ||
    firstString(prediction.common_name) ||
    firstString(prediction.species_name) ||
    firstString(prediction.target_species) ||
    firstString(prediction.catch_name) ||
    'Unidentified species';

  const fallbackId = speciesCode ?? `species-${index}`;
  const idSource = rawSpeciesId && rawSpeciesId.length > 0 ? rawSpeciesId : fallbackId;
  const id =
    idSource
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || fallbackId.toLowerCase();

  const scientificName =
    firstString(prediction.species_scientific_name) ||
    firstString(prediction.scientific_name) ||
    firstString(prediction.binomial_name) ||
    firstString(prediction.latin_name) ||
    undefined;

  const summary =
    firstString(prediction.headline) ||
    firstString(prediction.summary) ||
    firstString(prediction.outlook) ||
    firstString(prediction.description) ||
    undefined;

  const rationale = collectFromKeys(prediction, [
    'rationale',
    'confidence_rationale',
    'reasoning',
    'drivers',
    'environmental_alignment',
  ]);

  const baitSuggestions = collectFromKeys(prediction, [
    'bait_suggestions',
    'recommended_baits',
    'favourite_baits',
    'effective_baits',
    'bait_notes',
  ]);

  const tideTips = collectFromKeys(prediction, [
    'tide_tips',
    'tide_advice',
    'tidal_considerations',
    'timing_notes',
  ]);

  const statusNotes = collectFromKeys(prediction, [
    'status_notes',
    'management_notes',
    'regulation_notes',
    'stock_status_summary',
    'fun_facts',
  ]);

  const imageInfo = resolveSpeciesImage(speciesCode, commonName);
  
  // Prefer bio from prediction data (Supabase), fallback to hardcoded bios
  const bioFromPrediction = typeof prediction.playful_bio === 'string' && prediction.playful_bio.trim().length > 0
    ? prediction.playful_bio.trim()
    : null;
  const playfulBio = bioFromPrediction || getFindrFishBio(commonName);
  
  const localizedNames =
    parseLocalizedSpeciesNames(prediction.localized_names as JsonValue | undefined) ||
    parseLocalizedSpeciesNames(prediction.localizedNames as JsonValue | undefined);

  // Extract advice array from prediction
  const advice = Array.isArray(prediction.advice) 
    ? prediction.advice as SpeciesAdvice[]
    : undefined;

  return {
    id,
    commonName,
    scientificName,
    confidence: parseConfidence(prediction),
    summary,
    rationale,
    baitSuggestions,
    tideTips,
    statusNotes,
    emoji: getSpeciesEmoji(commonName),
    speciesId: rawSpeciesId ?? null,
    speciesCode,
    image: imageInfo
      ? {
          src: imageInfo.image,
          alt: imageInfo.name,
          mobile: imageInfo.mobile ?? null,
          thumb: imageInfo.thumb ?? null,
        }
      : undefined,
    playfulBio,
    localizedNames,
    advice,
  };
}

export type { JsonValue };
