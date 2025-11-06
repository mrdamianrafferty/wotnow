import { SPECIES_IMAGE_MAP, type SpeciesImageInfo } from '../../data/speciesImageMap';
import blurPlaceholders from '../../data/blur-placeholders.json';
import { generateBlurDataURL } from '../image/placeholder';
import { getFindrFishBio } from '../../data/findrFishBios';
import type { FishingPrediction } from '../../hooks/useFishingPredictions';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface CardImage {
  src: string;
  alt: string;
  mobile: string | null;
  thumb: string | null;
  blurDataURL?: string;
}

// Build a lookup for blurDataURL by code (case-insensitive)
const BLUR_PLACEHOLDER_MAP: Record<string, string> = {};
for (const entry of blurPlaceholders as Array<{ code: string; blurDataURL: string }>) {
  BLUR_PLACEHOLDER_MAP[entry.code.toLowerCase()] = entry.blurDataURL;
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

export interface TechniqueInfo {
  technique_id: number;
  technique_code: string;
  technique_name: string;
  effectiveness: number;
  notes: string | null;
  beginner_tips: string | null;
}

export interface BaitInfo {
  bait_id: number;
  bait_name: string;
  effectiveness: number;
  notes: string | null;
}

export interface SubstrateInfo {
  name_en: string;
  has_sand: boolean;
  has_gravel: boolean;
  has_rock: boolean;
  has_mud: boolean;
  has_mixed: boolean;
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
  slug?: string | null;              // Phase 5: URL-friendly species identifier
  aliases?: string[] | null;         // Phase 5: Alternative common names
  image?: CardImage;
  playfulBio?: string;
  localizedNames?: LocalizedSpeciesNames;
  advice?: SpeciesAdvice[];
  biteScore?: number | null;
  dailyPredictionScore?: number | null;  // NEW: For day-to-day comparisons (excludes tides/light/lunar)
  scoreBreakdown?: {
    bio?: number | null;
    temperature?: number | null;
    substrate?: number | null;
    depth?: number | null;
    light?: number | null;
    habitat?: number | null;
    lunar?: number | null;
    weather?: number | null;
    freshness?: number | null;
    completeness?: number | null;
  };
  // Individual score components for UI display
  temp_score?: number | null;
  tide_score?: number | null;
  light_score?: number | null;
  lunar_score?: number | null;
  weather_score?: number | null;
  bio_band_score?: number | null;
  habitat_bonus?: number | null;
  moonPhase?: string | null;
  moonIllumination?: number | null;
  biogeographicRegions?: string[] | null;
  
  // User-friendly species characteristics extracted from preferences
  depthRange?: string;    // e.g., "5-30m" or "Shallow coastal (0-20m)"
  seasonality?: string;   // e.g., "Spring-Autumn" or "Year-round"
  habitatType?: string;   // e.g., "Rocky reefs" or "Sandy bottom"
  
  // Phase 10: Environmental data from real CMEMS marine data
  data_freshness?: 'fresh' | 'recent' | 'older' | 'stale';
  weight_profile?: 'pelagic' | 'surf_estuary' | 'reef_kelp' | 'benthic' | 'cephalopod' | 'default_coastal';
  environmental_factors?: {
    temperature?: { actual: number; match: string; score: number; species_pref?: string };
    salinity?: { actual: number; match: string; score: number; species_pref?: string };
    depth?: { actual: number; match: string; score: number; species_pref?: string };
    substrate?: { actual: string; match: string; score: number; species_pref?: string };
    data_age_hours?: number;
    data_source?: string;
  };
  
  // Enhanced species data from database
  techniques?: TechniqueInfo[];
  bait?: BaitInfo[];
  substrates?: SubstrateInfo | null;
  inaturalist_url?: string | null;

  // Phase 1 Species Consolidation: Structured fishing content
  recommendedBaits?: string[] | null;         // Matches COMMON_BAITS from baitHabitatOptions.ts
  preferredHabitats?: string[] | null;        // Matches HABITAT_OPTIONS from baitHabitatOptions.ts
  effectiveTechniques?: string[] | null;      // Technique codes from fishing_techniques table
  bestTimes?: string[] | null;                // Optimal fishing times (dawn/dusk/tides)
  funFact?: string | null;                    // Fun fact about the species
  conservationStatus?: string | null;         // IUCN status code (LC, NT, VU, EN, etc.)
  contentLastReviewed?: string | null;        // ISO timestamp of last content review

  // Weather data (Phase 11) - weather_score is in score components above
  current_wind_speed_ms?: number | null;
  current_pressure_hpa?: number | null;

  // Week 3: Seasonality data
  seasonal_multiplier?: number;
  original_confidence?: number;

  // Species badges (e.g., shark, ray_skate, etc.)
  badges?: string[] | null;
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

/**
 * Format depth range from species preferences into user-friendly string
 */
function formatDepthRange(prediction: FishingPrediction): string | undefined {
  const depthMin = extractNumber(prediction.depth_min);
  const depthMax = extractNumber(prediction.depth_max);
  const depthOptMin = extractNumber(prediction.depth_optimal_min);
  const depthOptMax = extractNumber(prediction.depth_optimal_max);
  
  // If we have optimal range, use that
  if (depthOptMin != null && depthOptMax != null) {
    if (depthOptMax <= 20) {
      return `Shallow (${Math.round(depthOptMin)}-${Math.round(depthOptMax)}m)`;
    } else if (depthOptMin >= 50) {
      return `Deep (${Math.round(depthOptMin)}-${Math.round(depthOptMax)}m)`;
    } else {
      return `${Math.round(depthOptMin)}-${Math.round(depthOptMax)}m`;
    }
  }
  
  // Fall back to min/max range
  if (depthMin != null && depthMax != null) {
    if (depthMax <= 20) {
      return `Shallow (${Math.round(depthMin)}-${Math.round(depthMax)}m)`;
    } else if (depthMin >= 50) {
      return `Deep (${Math.round(depthMin)}-${Math.round(depthMax)}m)`;
    } else {
      return `${Math.round(depthMin)}-${Math.round(depthMax)}m`;
    }
  }
  
  return undefined;
}

/**
 * Format seasonality from species preferences into user-friendly string
 */
function formatSeasonality(prediction: FishingPrediction): string | undefined {
  // Check for explicit season fields
  const season = firstString(prediction.best_season) || 
                 firstString(prediction.peak_season) ||
                 firstString(prediction.preferred_season);
  
  if (season) return season;
  
  // Check temperature preferences to infer seasonality
  const tempMin = extractNumber(prediction.temp_min);
  const tempMax = extractNumber(prediction.temp_max);
  const tempOptMin = extractNumber(prediction.temp_optimal_min);
  const tempOptMax = extractNumber(prediction.temp_optimal_max);
  
  // Use optimal temp range if available
  const optMin = tempOptMin ?? tempMin;
  const optMax = tempOptMax ?? tempMax;
  
  if (optMin != null && optMax != null) {
    // Warm water species (>18°C optimal)
    if (optMin >= 16) return 'Summer-Autumn';
    // Cold water species (<12°C optimal)
    if (optMax <= 12) return 'Winter-Spring';
    // Temperate species (wide range)
    if (optMax - optMin > 10) return 'Year-round';
    // Moderate species
    return 'Spring-Autumn';
  }
  
  return 'Year-round';  // Default
}

/**
 * Format habitat type from species preferences into user-friendly string
 */
function formatHabitatType(prediction: FishingPrediction): string | undefined {
  const weightProfile = firstString(prediction.weight_profile);
  const substrate = firstString(prediction.actual_substrate) || 
                   firstString(prediction.substrate_preferred);
  
  // Use weight profile to determine habitat type
  if (weightProfile) {
    switch (weightProfile) {
      case 'pelagic': return 'Open water';
      case 'surf_estuary': return 'Estuaries & surf';
      case 'reef_kelp': return 'Rocky reefs & kelp';
      case 'benthic': return 'Seabed';
      case 'cephalopod': return 'Coastal waters';
      case 'default_coastal': return 'Coastal waters';
    }
  }
  
  // Use substrate if available
  if (substrate) {
    switch (substrate.toLowerCase()) {
      case 'rock': return 'Rocky areas';
      case 'sand': return 'Sandy bottom';
      case 'mud': return 'Muddy bottom';
      case 'mixed': return 'Mixed substrate';
      default: return substrate;
    }
  }
  
  return 'Coastal waters';  // Default
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

function parseStringArray(value: JsonValue | undefined): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const entries = value
      .map((entry) => firstString(entry as JsonValue))
      .filter((entry): entry is string => Boolean(entry && entry.trim().length > 0));
    return entries.length > 0 ? entries : undefined;
  }
  if (typeof value === 'string') {
    const parts = value
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  }
  return undefined;
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
    'confidence_percent',      // Phase 10: Primary field from get_environmental_predictions_basic
    'environmental_score',     // Phase 10: Fallback (0-10 scale, will be multiplied by 10)
    'confidence',
    'confidencePercentage',
    'confidence_score',
    'confidenceScore',
    'probability',
    'score',
    'bite_score',
  ];

  for (const key of candidateKeys) {
    const raw = extractNumber(prediction[key]);
    if (raw == null || Number.isNaN(raw)) continue;
    let value = raw;
    // If value is 0-1 (probability), convert to percentage
    if (value > 0 && value <= 1) {
      value *= 100;
    }
    // If value is 0-10 (environmental_score), convert to percentage
    if (key === 'environmental_score' && value >= 0 && value <= 10) {
      value *= 10;
    }
    if (value < 0) continue;
    return Math.round(Math.min(value, 100));
  }
  return null;
}

/**
 * Generate Findr-style explanation for confidence score based on environmental factors
 */
function generateEnvironmentalRationale(prediction: FishingPrediction): string[] {
  const rationale: string[] = [];
  
  // Extract match labels
  const tempMatch = firstString(prediction.temperature_match);
  const salMatch = firstString(prediction.salinity_match);
  const substrateMatch = firstString(prediction.substrate_match);
  
  // Get actual values from factors if available
  const factors = prediction.factors as Record<string, JsonValue> | null;
  const temp = typeof factors?.temperature === 'object' && factors?.temperature && 'actual' in factors.temperature 
    ? factors.temperature.actual : null;
  const sal = typeof factors?.salinity === 'object' && factors?.salinity && 'actual' in factors.salinity 
    ? factors.salinity.actual : null;
  const substrate = typeof factors?.substrate === 'object' && factors?.substrate && 'actual' in factors.substrate 
    ? factors.substrate.actual : null;

  // 🌡️ Temperature
  if (tempMatch === 'optimal' && temp != null) {
    rationale.push(`Water’s sitting nicely at ${temp}°C — bang on for this species.`);
  } else if (tempMatch === 'acceptable' && temp != null) {
    rationale.push(`At ${temp}°C, it’s workable, but not quite prime conditions.`);
  } else if (tempMatch === 'poor' && temp != null) {
    rationale.push(`Water’s around ${temp}°C — not their favourite range.`);
  }

  // 🌊 Salinity
  if (salMatch === 'optimal' && sal != null) {
    rationale.push(`Salinity’s spot on at ${sal} ppt — just how they like it.`);
  } else if (salMatch === 'acceptable' && sal != null) {
    rationale.push(`Salinity’s fine at ${sal} ppt — nothing to complain about.`);
  } else if (salMatch === 'poor' && sal != null) {
    rationale.push(`Salinity’s off at ${sal} ppt — could put them off feeding.`);
  }

  // 🪸 Seabed / Substrate
  if (substrateMatch === 'optimal' || substrateMatch === 'preferred') {
    rationale.push(`The seabed (${substrate || 'mixed'}) suits them perfectly.`);
  } else if (substrateMatch === 'suitable') {
    rationale.push(`The seabed (${substrate || 'mixed'}) works fine — not their top choice though.`);
  } else if (substrateMatch === 'acceptable') {
    rationale.push(`They’ll make do with the ${substrate || 'mixed'} bottom.`);
  } else if (substrateMatch === 'poor') {
    rationale.push(`The ${substrate || 'mixed'} bottom isn’t really their thing.`);
  }

  return rationale;
}

export function resolveSpeciesImage(
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
    firstString(prediction.name_en) ||
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

  // Phase 5: Extract slug (URL-friendly species identifier)
  const slug =
    firstString(prediction.slug) ||
    undefined;

  // Phase 5: Extract aliases (alternative common names)
  const aliases = Array.isArray(prediction.aliases)
    ? prediction.aliases.filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
    : undefined;

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
  
  // Add environmental rationale based on Phase 10 data
  const envRationale = generateEnvironmentalRationale(prediction);
  rationale.push(...envRationale);
  
  // Debug: Log rationale generation
  if (envRationale.length > 0) {
    console.log('[mapPrediction] Generated rationale for', firstString(prediction.species_name), ':', envRationale);
  }

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

  // Phase 10: Extract environmental data
  const biteScoreValue = extractNumber(prediction.bite_score);
  const dailyPredictionScoreValue = extractNumber(prediction.daily_prediction_score);
  const scoreBreakdownRaw: CardData['scoreBreakdown'] = {
    bio: extractNumber(prediction.bio_band_score),
    temperature: extractNumber(prediction.temp_score),
    substrate: extractNumber(prediction.substrate_score),
    depth: extractNumber(prediction.depth_score),
    light: extractNumber(prediction.light_score),
    habitat: extractNumber(prediction.habitat_bonus),
    lunar: extractNumber(prediction.lunar_score),
    weather: extractNumber(prediction.weather_score),
    freshness: extractNumber(prediction.freshness_score),
    completeness: extractNumber(prediction.completeness_score),
  };
  const hasScoreBreakdown = Object.values(scoreBreakdownRaw ?? {}).some((value) => value != null);

  const moonPhase = firstString(prediction.moon_phase) || firstString(prediction.moonPhase) || null;
  const moonIlluminationValue = extractNumber(prediction.moon_illumination);
  const biogeographicRegions =
    parseStringArray(prediction.biogeographic_regions as JsonValue | undefined) ??
    parseStringArray(prediction.biogeographicRegions as JsonValue | undefined);

  const data_freshness = firstString(prediction.data_freshness) as CardData['data_freshness'];
  // Prefer 'guild' or 'fish_guild' from DB, fallback to prediction.weight_profile
  const weight_profile =
    (firstString(prediction.guild) as CardData['weight_profile']) ||
    (firstString(prediction.fish_guild) as CardData['weight_profile']) ||
    (firstString(prediction.weight_profile) as CardData['weight_profile']);
  // Map species_badges (array of strings) from DB to badges
  let badges: string[] | null = null;
  if (Array.isArray(prediction.species_badges)) {
    badges = (prediction.species_badges as unknown[]).filter((b: unknown): b is string => typeof b === 'string' && b.length > 0);
  } else if (typeof prediction.species_badges === 'string') {
    try {
      const parsed = JSON.parse(prediction.species_badges);
      if (Array.isArray(parsed)) {
        badges = (parsed as unknown[]).filter((b: unknown): b is string => typeof b === 'string' && b.length > 0);
      }
    } catch {}
  }
  
  // Extract factors from JSONB (from get_environmental_predictions_basic function)
  let environmental_factors: CardData['environmental_factors'];
  if (prediction.factors && typeof prediction.factors === 'object') {
    const factors = prediction.factors as Record<string, JsonValue>;
    
    // Helper to safely extract nested values
    const getFactorValue = (factorObj: JsonValue, key: string): JsonValue | null => {
      if (factorObj && typeof factorObj === 'object' && !Array.isArray(factorObj)) {
        return (factorObj as Record<string, JsonValue>)[key] || null;
      }
      return null;
    };
    
    environmental_factors = {
      temperature: factors.temperature ? {
        actual: Number(getFactorValue(factors.temperature, 'actual')) || 0,
        match: String(getFactorValue(factors.temperature, 'match') || ''),
        score: Number(getFactorValue(factors.temperature, 'score')) || 0,
        species_pref: getFactorValue(factors.temperature, 'species_pref') ? String(getFactorValue(factors.temperature, 'species_pref')) : undefined
      } : undefined,
      salinity: factors.salinity ? {
        actual: Number(getFactorValue(factors.salinity, 'actual')) || 0,
        match: String(getFactorValue(factors.salinity, 'match') || ''),
        score: Number(getFactorValue(factors.salinity, 'score')) || 0,
        species_pref: getFactorValue(factors.salinity, 'species_pref') ? String(getFactorValue(factors.salinity, 'species_pref')) : undefined
      } : undefined,
      depth: factors.depth ? {
        actual: Number(getFactorValue(factors.depth, 'actual')) || 0,
        match: String(getFactorValue(factors.depth, 'match') || ''),
        score: Number(getFactorValue(factors.depth, 'score')) || 0,
        species_pref: getFactorValue(factors.depth, 'species_pref') ? String(getFactorValue(factors.depth, 'species_pref')) : undefined
      } : undefined,
      substrate: factors.substrate ? {
        actual: String(getFactorValue(factors.substrate, 'actual') || ''),
        match: String(getFactorValue(factors.substrate, 'match') || ''),
        score: Number(getFactorValue(factors.substrate, 'score')) || 0,
        species_pref: getFactorValue(factors.substrate, 'species_pref') ? String(getFactorValue(factors.substrate, 'species_pref')) : undefined
      } : undefined,
      data_age_hours: factors.data_age_hours !== undefined && factors.data_age_hours !== null
        ? Number(factors.data_age_hours) 
        : undefined,
      data_source: factors.data_source 
        ? String(factors.data_source) 
        : undefined
    };
  }

  return {
    id,
    commonName,
    scientificName,
    slug,              // Phase 5: URL-friendly species identifier
    aliases,           // Phase 5: Alternative common names
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
          blurDataURL:
            BLUR_PLACEHOLDER_MAP[imageInfo.code?.toLowerCase?.()] ||
            BLUR_PLACEHOLDER_MAP[imageInfo.slug?.toLowerCase?.()] ||
            BLUR_PLACEHOLDER_MAP[imageInfo.name?.toLowerCase?.().replace(/\s+/g, '-') || ''] ||
            generateBlurDataURL(32, 20),
        }
      : undefined,
    playfulBio,
    localizedNames,
    advice,
    
    // Extract user-friendly species characteristics
    depthRange: formatDepthRange(prediction),
   seasonality: formatSeasonality(prediction),
   habitatType: formatHabitatType(prediction),
    biteScore: biteScoreValue ?? undefined,
    dailyPredictionScore: dailyPredictionScoreValue ?? undefined,
    scoreBreakdown: hasScoreBreakdown ? scoreBreakdownRaw : undefined,
    moonPhase: moonPhase ?? undefined,
    moonIllumination: moonIlluminationValue ?? undefined,
    biogeographicRegions: biogeographicRegions ?? undefined,
    
    // Weather data
    weather_score: extractNumber(prediction.weather_score),
    current_wind_speed_ms: extractNumber(prediction.current_wind_speed_ms),
    current_pressure_hpa: extractNumber(prediction.current_pressure_hpa),

    // Individual score components for UI display (bite score breakdown)
    temp_score: extractNumber(prediction.temp_score),
    tide_score: extractNumber(prediction.tide_score),
    light_score: extractNumber(prediction.light_score),
    lunar_score: extractNumber(prediction.lunar_score),
    bio_band_score: extractNumber(prediction.bio_band_score),
    habitat_bonus: extractNumber(prediction.habitat_bonus),

    // Phase 10: Environmental data
    data_freshness,
  weight_profile,
  badges,
    environmental_factors,

    // Week 3: Seasonality data
    seasonal_multiplier: extractNumber(prediction.seasonal_multiplier) ?? undefined,
    original_confidence: extractNumber(prediction.original_confidence) ?? undefined,

    // Phase 1 Species Consolidation: Structured fishing content
    recommendedBaits: parseStringArray(prediction.recommended_baits as JsonValue | undefined) ?? null,
    preferredHabitats: parseStringArray(prediction.preferred_habitats as JsonValue | undefined) ?? null,
    effectiveTechniques: parseStringArray(prediction.effective_techniques as JsonValue | undefined) ?? null,
    bestTimes: parseStringArray(prediction.best_times as JsonValue | undefined) ?? null,
    funFact: firstString(prediction.fun_fact_en) ?? null,
    conservationStatus: firstString(prediction.conservation_status) ?? null,
    contentLastReviewed: firstString(prediction.content_last_reviewed) ?? null,
  };
}

export type { JsonValue };
