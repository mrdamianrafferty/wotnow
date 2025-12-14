/**
 * Perenual API Client
 * Premium tier: 10,000 requests/day
 * Docs: https://perenual.com/docs/api
 */

// Lazy-load API key to allow dotenv to run first
function getApiKey(): string {
  const key = process.env.PERENUAL_API_KEY;
  if (!key) {
    throw new Error('PERENUAL_API_KEY not configured');
  }
  return key;
}

const BASE_URL = 'https://perenual.com/api';

// Rate limiting: Premium allows 10k/day, be conservative
const RATE_LIMIT_DELAY_MS = 200; // 5 requests/second max

// ============ Types ============

export interface PerenualImage {
  license: number;
  license_name: string;
  license_url: string;
  original_url: string;
  regular_url: string;
  medium_url: string;
  small_url: string;
  thumbnail: string;
}

export interface PerenualDimension {
  type: string;
  min_value: number;
  max_value: number;
  unit: string;
}

export interface PerenualWateringBenchmark {
  value: string;
  unit: string;
}

export interface PerenualHardinessLocation {
  full_url: string;
  full_iframe: string;
}

export interface PerenualSpeciesListItem {
  id: number;
  common_name: string;
  scientific_name: string[];
  other_name: string[] | null;
  cycle: string;
  watering: string;
  sunlight: string[];
  default_image: PerenualImage | null;
}

export interface PerenualSpeciesDetail {
  id: number;
  common_name: string;
  scientific_name: string[];
  other_name: string[] | null;
  family: string | null;
  origin: string[] | null;
  type: string;
  dimension: string;
  dimensions: PerenualDimension;
  cycle: string;
  attracts: string[] | null;
  propagation: string[] | null;
  hardiness: {
    min: string;
    max: string;
  };
  hardiness_location: PerenualHardinessLocation;
  watering: string;
  watering_period: string | null;
  watering_general_benchmark: PerenualWateringBenchmark;
  depth_water_requirement: unknown;
  volume_water_requirement: unknown;
  sunlight: string[];
  pruning_month: string[] | null;
  pruning_count: unknown;
  seeds: number;
  maintenance: string | null;
  care_guides: string; // URL to care guides
  soil: string[] | null;
  growth_rate: string;
  drought_tolerant: boolean;
  salt_tolerant: boolean;
  thorny: boolean;
  invasive: boolean;
  tropical: boolean;
  indoor: boolean;
  care_level: string | null;
  pest_susceptibility: string | null;
  pest_susceptibility_api: string;
  flowers: boolean;
  flowering_season: string | null;
  flower_color: string;
  cones: boolean;
  fruits: boolean;
  edible_fruit: boolean;
  edible_fruit_taste_profile: string;
  fruit_nutritional_value: string;
  fruit_color: string[] | null;
  harvest_season: string | null;
  harvest_method: string | null;
  leaf: boolean;
  leaf_color: string[] | null;
  edible_leaf: boolean;
  edible_leaf_taste_profile: string;
  leaf_nutritional_value: string;
  cuisine: boolean;
  cuisine_list: string;
  medicinal: boolean;
  medicinal_use: string;
  medicinal_method: string;
  poisonous_to_humans: number;
  poison_effects_to_humans: string;
  poison_to_humans_cure: string;
  poisonous_to_pets: number;
  poison_effects_to_pets: string;
  poison_to_pets_cure: string;
  description: string;
  default_image: PerenualImage | null;
  other_images: string;
}

export interface PerenualSearchResponse {
  data: PerenualSpeciesListItem[];
  to: number;
  per_page: number;
  current_page: number;
  from: number;
  last_page: number;
  total: number;
}

export interface PerenualCareGuideSection {
  id: number;
  type: string;
  description: string;
}

export interface PerenualCareGuide {
  id: number;
  species_id: number;
  common_name: string;
  scientific_name: string[];
  section: PerenualCareGuideSection[];
}

export interface PerenualCareGuidesResponse {
  data: PerenualCareGuide[];
  to: number;
  per_page: number;
  current_page: number;
  from: number;
  last_page: number;
  total: number;
}

// ============ Pest/Disease Types ============

export interface PerenualPestDiseaseImage {
  license: number;
  license_name: string;
  license_url: string;
  original_url: string;
  regular_url: string;
  medium_url: string;
  small_url: string;
  thumbnail: string;
}

export interface PerenualPestDiseaseSection {
  subtitle: string;
  description: string;
}

export interface PerenualPestDisease {
  id: number;
  common_name: string;
  scientific_name: string | null;
  other_name: string[] | null;
  family: string | null;
  description: PerenualPestDiseaseSection[] | null;
  solution: PerenualPestDiseaseSection[] | null;
  host: string[] | null;
  images: PerenualPestDiseaseImage[] | null;
}

export interface PerenualPestDiseaseResponse {
  data: PerenualPestDisease[];
  to: number;
  per_page: number;
  current_page: number;
  from: number;
  last_page: number;
  total: number;
}

// ============ Helper Functions ============

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  retries = 3,
  delayMs = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      
      if (response.status === 429) {
        // Rate limited - wait longer
        console.warn(`Rate limited, waiting ${delayMs * (i + 1)}ms...`);
        await sleep(delayMs * (i + 1));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Fetch failed, retrying in ${delayMs}ms...`, error);
      await sleep(delayMs);
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

// ============ API Functions ============

/**
 * Search for species by name
 */
export async function searchSpecies(
  query: string,
  page = 1
): Promise<PerenualSearchResponse | null> {
  const apiKey = getApiKey();
  
  const url = `${BASE_URL}/species-list?key=${apiKey}&q=${encodeURIComponent(query)}&page=${page}`;
  
  await sleep(RATE_LIMIT_DELAY_MS);
  
  try {
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      console.error(`Search failed for "${query}": ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Search error for "${query}":`, error);
    return null;
  }
}

/**
 * Get detailed species information by Perenual ID
 */
export async function getSpeciesDetails(
  perenualId: number
): Promise<PerenualSpeciesDetail | null> {
  const apiKey = getApiKey();
  
  const url = `${BASE_URL}/species/details/${perenualId}?key=${apiKey}`;
  
  await sleep(RATE_LIMIT_DELAY_MS);
  
  try {
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      console.error(`Get details failed for ID ${perenualId}: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Get details error for ID ${perenualId}:`, error);
    return null;
  }
}

/**
 * Get care guides for a species
 */
export async function getCareGuides(
  perenualId: number
): Promise<PerenualCareGuide | null> {
  const apiKey = getApiKey();
  
  const url = `${BASE_URL}/species-care-guide-list?key=${apiKey}&species_id=${perenualId}`;
  
  await sleep(RATE_LIMIT_DELAY_MS);
  
  try {
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      console.error(`Get care guides failed for ID ${perenualId}: ${response.status}`);
      return null;
    }
    
    const data: PerenualCareGuidesResponse = await response.json();
    return data.data?.[0] ?? null;
  } catch (error) {
    console.error(`Get care guides error for ID ${perenualId}:`, error);
    return null;
  }
}

/**
 * Browse all species (paginated)
 */
export async function listAllSpecies(
  page = 1,
  indoor?: boolean
): Promise<PerenualSearchResponse | null> {
  const apiKey = getApiKey();
  
  let url = `${BASE_URL}/species-list?key=${apiKey}&page=${page}`;
  if (indoor !== undefined) {
    url += `&indoor=${indoor ? 1 : 0}`;
  }
  
  await sleep(RATE_LIMIT_DELAY_MS);
  
  try {
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      console.error(`List species failed for page ${page}: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`List species error for page ${page}:`, error);
    return null;
  }
}

// ============ Matching Helpers ============

/**
 * Calculate string similarity (Levenshtein distance normalized)
 */
export function stringSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  
  if (aLower === bLower) return 1;
  
  const longer = aLower.length > bLower.length ? aLower : bLower;
  const shorter = aLower.length > bLower.length ? bLower : aLower;
  
  if (longer.length === 0) return 1;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= shorter.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= longer.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= shorter.length; i++) {
    for (let j = 1; j <= longer.length; j++) {
      if (shorter[i - 1] === longer[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return (longer.length - matrix[shorter.length][longer.length]) / longer.length;
}

/**
 * Find best match from Perenual search results
 */
export function findBestMatch(
  ourName: string,
  ourScientificName: string | null,
  results: PerenualSpeciesListItem[]
): { match: PerenualSpeciesListItem | null; confidence: 'exact' | 'high' | 'medium' | 'low' | 'none' } {
  if (!results || results.length === 0) {
    return { match: null, confidence: 'none' };
  }
  
  const ourNameNorm = ourName.toLowerCase().trim();
  const ourSciNorm = ourScientificName?.toLowerCase().trim();
  
  // Check for exact matches first
  for (const r of results) {
    const commonNorm = r.common_name.toLowerCase().trim();
    
    // Exact common name match
    if (commonNorm === ourNameNorm) {
      return { match: r, confidence: 'exact' };
    }
    
    // Exact scientific name match
    if (ourSciNorm && r.scientific_name.some(s => s.toLowerCase().trim() === ourSciNorm)) {
      return { match: r, confidence: 'exact' };
    }
    
    // Check other names
    if (r.other_name?.some(n => n.toLowerCase().trim() === ourNameNorm)) {
      return { match: r, confidence: 'exact' };
    }
  }
  
  // Score all results
  const scored = results.map(r => {
    const commonSim = stringSimilarity(ourName, r.common_name);
    const sciSims = ourSciNorm 
      ? r.scientific_name.map(s => stringSimilarity(ourSciNorm, s))
      : [0];
    const maxSciSim = Math.max(...sciSims);
    const otherNameSims = r.other_name?.map(n => stringSimilarity(ourName, n)) ?? [0];
    const maxOtherSim = Math.max(...otherNameSims);
    
    const bestScore = Math.max(commonSim, maxSciSim, maxOtherSim);
    
    return { result: r, score: bestScore };
  });
  
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  
  if (best.score >= 0.9) {
    return { match: best.result, confidence: 'high' };
  } else if (best.score >= 0.7) {
    return { match: best.result, confidence: 'medium' };
  } else if (best.score >= 0.5) {
    return { match: best.result, confidence: 'low' };
  }
  
  return { match: null, confidence: 'none' };
}

// ============ Data Transformation ============

/**
 * Parse hardiness zone string to number
 */
export function parseHardinessZone(zone: string | undefined): number | null {
  if (!zone) return null;
  const match = zone.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Convert dimension to cm
 */
export function dimensionToCm(dim: PerenualDimension | undefined): { min: number | null; max: number | null } {
  if (!dim) return { min: null, max: null };
  
  let multiplier = 1;
  if (dim.unit === 'feet' || dim.unit === 'ft') {
    multiplier = 30.48;
  } else if (dim.unit === 'inches' || dim.unit === 'in') {
    multiplier = 2.54;
  } else if (dim.unit === 'meters' || dim.unit === 'm') {
    multiplier = 100;
  }
  
  return {
    min: dim.min_value ? Math.round(dim.min_value * multiplier * 100) / 100 : null,
    max: dim.max_value ? Math.round(dim.max_value * multiplier * 100) / 100 : null,
  };
}

// ============ Pest/Disease API Functions ============

/**
 * List pests and diseases from Perenual API
 * @param page - Page number (30 results per page)
 */
export async function listPestDiseases(page: number = 1): Promise<PerenualPestDiseaseResponse> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/pest-disease-list?key=${apiKey}&page=${page}`;
  
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`Perenual pest-disease list API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get a specific pest/disease by ID
 */
export async function getPestDiseaseById(id: number): Promise<PerenualPestDisease | null> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/pest-disease-list?key=${apiKey}&id=${id}`;
  
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`Perenual pest-disease API error: ${response.status}`);
  }
  
  const data: PerenualPestDiseaseResponse = await response.json();
  return data.data[0] || null;
}

/**
 * Search pests and diseases by name
 */
export async function searchPestDiseases(query: string, page: number = 1): Promise<PerenualPestDiseaseResponse> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/pest-disease-list?key=${apiKey}&q=${encodeURIComponent(query)}&page=${page}`;
  
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`Perenual pest-disease search API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch all pests and diseases (paginated)
 */
export async function getAllPestDiseases(): Promise<PerenualPestDisease[]> {
  const all: PerenualPestDisease[] = [];
  let page = 1;
  let lastPage = 1;
  
  do {
    console.log(`Fetching pest-disease page ${page}...`);
    const response = await listPestDiseases(page);
    all.push(...response.data);
    lastPage = response.last_page;
    page++;
    
    // Rate limiting - wait 200ms between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  } while (page <= lastPage);
  
  return all;
}

/**
 * Find best matching pest/disease for a given threat name
 * Returns the match with confidence level
 */
export async function findMatchingPestDisease(
  threatName: string,
  scientificName?: string
): Promise<{ match: PerenualPestDisease | null; confidence: 'exact' | 'high' | 'medium' | 'low' | 'none' }> {
  // First, search by common name
  const searchResults = await searchPestDiseases(threatName);
  const results = searchResults.data;
  
  if (results.length === 0) {
    // Try scientific name if provided
    if (scientificName) {
      const sciResults = await searchPestDiseases(scientificName);
      if (sciResults.data.length === 0) {
        return { match: null, confidence: 'none' };
      }
      return findBestPestDiseaseMatch(threatName, scientificName, sciResults.data);
    }
    return { match: null, confidence: 'none' };
  }
  
  return findBestPestDiseaseMatch(threatName, scientificName, results);
}

function findBestPestDiseaseMatch(
  threatName: string,
  scientificName: string | undefined,
  results: PerenualPestDisease[]
): { match: PerenualPestDisease | null; confidence: 'exact' | 'high' | 'medium' | 'low' | 'none' } {
  const threatNameNorm = threatName.toLowerCase().trim();
  const sciNameNorm = scientificName?.toLowerCase().trim();
  
  // Check for exact matches first
  for (const r of results) {
    if (r.common_name.toLowerCase().trim() === threatNameNorm) {
      return { match: r, confidence: 'exact' };
    }
    if (sciNameNorm && r.scientific_name?.toLowerCase().trim() === sciNameNorm) {
      return { match: r, confidence: 'exact' };
    }
    if (r.other_name?.some(n => n.toLowerCase().trim() === threatNameNorm)) {
      return { match: r, confidence: 'exact' };
    }
  }
  
  // Score all results by similarity
  const scored = results.map(r => {
    const commonSim = stringSimilarity(threatName, r.common_name);
    const sciSim = sciNameNorm && r.scientific_name 
      ? stringSimilarity(sciNameNorm, r.scientific_name)
      : 0;
    const otherNameSims = r.other_name?.map(n => stringSimilarity(threatName, n)) ?? [0];
    const maxOtherSim = Math.max(...otherNameSims);
    
    const bestScore = Math.max(commonSim, sciSim, maxOtherSim);
    
    return { result: r, score: bestScore };
  });
  
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  
  if (best.score >= 0.9) {
    return { match: best.result, confidence: 'high' };
  } else if (best.score >= 0.7) {
    return { match: best.result, confidence: 'medium' };
  } else if (best.score >= 0.5) {
    return { match: best.result, confidence: 'low' };
  }
  
  return { match: null, confidence: 'none' };
}
