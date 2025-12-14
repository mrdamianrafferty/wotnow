#!/usr/bin/env npx tsx
/**
 * Perenual Data Sync Script
 * 
 * Syncs plant species data from Perenual API to Supabase.
 * Premium tier: 10,000 requests/day
 * 
 * Usage:
 *   npx tsx scripts/sync-perenual-data.ts              # Sync all unsynced species
 *   npx tsx scripts/sync-perenual-data.ts --force      # Re-sync all species
 *   npx tsx scripts/sync-perenual-data.ts --slug=tomato # Sync single species
 *   npx tsx scripts/sync-perenual-data.ts --dry-run    # Preview without writing
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import {
  searchSpecies,
  getSpeciesDetails,
  getCareGuides,
  findBestMatch,
  parseHardinessZone,
  dimensionToCm,
  type PerenualSpeciesDetail,
  type PerenualCareGuide,
} from '../lib/grow/perenualApi';

// ============ Configuration ============

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!process.env.PERENUAL_API_KEY) {
  console.error('Missing PERENUAL_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============ Types ============

interface OurSpecies {
  slug: string;
  name: string;
  scientific_name: string | null;
  perenual_id: number | null;
  perenual_last_synced_at: string | null;
}

interface SyncStats {
  total: number;
  matched: number;
  unmatched: number;
  errors: number;
  skipped: number;
  careGuidesFetched: number;
}

// ============ CLI Arguments ============

const args = process.argv.slice(2);
const forceResync = args.includes('--force');
const dryRun = args.includes('--dry-run');
const singleSlug = args.find(a => a.startsWith('--slug='))?.split('=')[1];
const verbose = args.includes('--verbose') || args.includes('-v');

// ============ Main Sync Logic ============

async function fetchOurSpecies(): Promise<OurSpecies[]> {
  let query = supabase
    .from('plant_species')
    .select('slug, name, scientific_name, perenual_id, perenual_last_synced_at');
  
  if (singleSlug) {
    query = query.eq('slug', singleSlug);
  } else if (!forceResync) {
    // Only fetch species not yet synced
    query = query.is('perenual_id', null);
  }
  
  const { data, error } = await query.order('name');
  
  if (error) {
    console.error('Failed to fetch species:', error);
    return [];
  }
  
  return data ?? [];
}

async function logSyncAttempt(
  ourSlug: string | null,
  ourName: string,
  searchQuery: string,
  resultsCount: number,
  matchedId: number | null,
  matchedName: string | null,
  confidence: 'exact' | 'high' | 'medium' | 'low' | 'none',
  status: 'matched' | 'unmatched' | 'multiple' | 'error' | 'skipped',
  errorMessage?: string
): Promise<void> {
  if (dryRun) return;
  
  await supabase.from('perenual_sync_logs').insert({
    our_slug: ourSlug,
    our_name: ourName,
    perenual_search_query: searchQuery,
    perenual_results_count: resultsCount,
    perenual_matched_id: matchedId,
    perenual_matched_name: matchedName,
    match_confidence: confidence,
    status,
    error_message: errorMessage,
  });
}

async function cachePerenualResponse(
  perenualId: number,
  commonName: string,
  scientificName: string[],
  detail: PerenualSpeciesDetail,
  careGuide: PerenualCareGuide | null
): Promise<void> {
  if (dryRun) return;
  
  await supabase.from('perenual_response_cache').upsert({
    perenual_id: perenualId,
    common_name: commonName,
    scientific_name: scientificName,
    response_json: detail,
    care_guide_json: careGuide,
    fetched_at: new Date().toISOString(),
  }, { onConflict: 'perenual_id' });
}

async function updateSpeciesWithPerenualData(
  slug: string,
  perenualId: number,
  detail: PerenualSpeciesDetail,
  careGuide: PerenualCareGuide | null
): Promise<boolean> {
  if (dryRun) {
    console.log(`  [DRY RUN] Would update ${slug} with Perenual ID ${perenualId}`);
    return true;
  }
  
  const dims = dimensionToCm(detail.dimensions);
  
  const updateData = {
    // Perenual identifiers
    perenual_id: perenualId,
    perenual_common_name: detail.common_name,
    perenual_scientific_name: detail.scientific_name,
    perenual_other_names: detail.other_name,
    perenual_family: detail.family,
    
    // Growth & Care
    growth_rate: detail.growth_rate || null,
    maintenance: detail.maintenance || null,
    watering: detail.watering || null,
    watering_general_benchmark: detail.watering_general_benchmark || null,
    watering_period: detail.watering_period || null,
    drought_tolerant: detail.drought_tolerant ?? false,
    salt_tolerant: detail.salt_tolerant ?? false,
    thorny: detail.thorny ?? false,
    invasive: detail.invasive ?? false,
    tropical: detail.tropical ?? false,
    indoor: detail.indoor ?? false,
    care_level: detail.care_level || null,
    
    // Dimensions
    dimension: detail.dimension || null,
    dimensions: detail.dimensions || null,
    average_height_cm: dims.min,
    maximum_height_cm: dims.max,
    
    // Environmental preferences
    sunlight: detail.sunlight || null,
    soil: detail.soil || null,
    hardiness_min: parseHardinessZone(detail.hardiness?.min),
    hardiness_max: parseHardinessZone(detail.hardiness?.max),
    hardiness_location: detail.hardiness_location || null,
    
    // Flowering & Visual
    flowers: detail.flowers ?? false,
    flowering_season: detail.flowering_season || null,
    flower_color: detail.flower_color || null,
    cones: detail.cones ?? false,
    fruits: detail.fruits ?? false,
    edible_fruit: detail.edible_fruit ?? false,
    edible_fruit_taste_profile: detail.edible_fruit_taste_profile || null,
    fruit_nutritional_value: detail.fruit_nutritional_value || null,
    fruit_color: detail.fruit_color || null,
    harvest_season: detail.harvest_season || null,
    harvest_method: detail.harvest_method || null,
    leaf: detail.leaf ?? true,
    leaf_color: detail.leaf_color || null,
    edible_leaf: detail.edible_leaf ?? false,
    edible_leaf_taste_profile: detail.edible_leaf_taste_profile || null,
    leaf_nutritional_value: detail.leaf_nutritional_value || null,
    cuisine: detail.cuisine ?? false,
    cuisine_list: detail.cuisine_list || null,
    medicinal: detail.medicinal ?? false,
    medicinal_use: detail.medicinal_use || null,
    medicinal_method: detail.medicinal_method || null,
    
    // Toxicity
    poisonous_to_humans: detail.poisonous_to_humans ?? 0,
    poisonous_to_pets: detail.poisonous_to_pets ?? 0,
    poison_effects_to_humans: detail.poison_effects_to_humans || null,
    poison_effects_to_pets: detail.poison_effects_to_pets || null,
    poison_to_humans_cure: detail.poison_to_humans_cure || null,
    poison_to_pets_cure: detail.poison_to_pets_cure || null,
    
    // Wildlife
    attracts: detail.attracts || null,
    pest_susceptibility: detail.pest_susceptibility?.split(',').map(s => s.trim()) || null,
    pest_susceptibility_api: detail.pest_susceptibility_api || null,
    
    // Propagation
    propagation: detail.propagation || null,
    seeds: detail.seeds ?? 0,
    
    // Images
    perenual_default_image: detail.default_image || null,
    
    // Care guides
    care_guides: careGuide?.section || null,
    
    // Metadata
    perenual_last_synced_at: new Date().toISOString(),
    perenual_raw_response: detail,
  };
  
  const { error } = await supabase
    .from('plant_species')
    .update(updateData)
    .eq('slug', slug);
  
  if (error) {
    console.error(`  Failed to update ${slug}:`, error.message);
    return false;
  }
  
  return true;
}

/**
 * Generate search variations for a plant name
 */
function getSearchVariations(name: string, scientificName: string | null): string[] {
  const variations: string[] = [];
  
  // Original name
  variations.push(name);
  
  // Remove parenthetical suffixes: "Tomato (slicer)" -> "Tomato"
  const withoutParens = name.replace(/\s*\([^)]+\)\s*$/, '').trim();
  if (withoutParens !== name && withoutParens.length > 2) {
    variations.push(withoutParens);
  }
  
  // Remove prefixes like "Herb-", "Tree-", "Fruit-"
  const withoutPrefix = name.replace(/^(herb|tree|fruit|flower|vegetable)-?\s*/i, '').trim();
  if (withoutPrefix !== name && withoutPrefix.length > 2) {
    variations.push(withoutPrefix);
  }
  
  // Handle "X / Y" patterns: "Rocket / arugula" -> "Rocket", "arugula"
  if (name.includes('/')) {
    const parts = name.split('/').map(p => p.trim());
    variations.push(...parts.filter(p => p.length > 2));
  }
  
  // Scientific name if available
  if (scientificName && scientificName.length > 3) {
    variations.push(scientificName);
    // Also try just genus (first word)
    const genus = scientificName.split(' ')[0];
    if (genus.length > 3) {
      variations.push(genus);
    }
  }
  
  // Deduplicate and return
  return [...new Set(variations)];
}

async function syncSpecies(species: OurSpecies, stats: SyncStats): Promise<void> {
  console.log(`\n[${stats.total}] Processing: ${species.name} (${species.slug})`);
  
  const searchVariations = getSearchVariations(species.name, species.scientific_name);
  
  let bestMatch: { match: Awaited<ReturnType<typeof findBestMatch>>['match']; confidence: string; query: string } | null = null;
  let totalResultsFound = 0;
  
  // Try each search variation until we find a good match
  for (const query of searchVariations) {
    if (verbose) {
      console.log(`  Trying: "${query}"`);
    }
    
    const searchResults = await searchSpecies(query);
    
    if (!searchResults) {
      console.log(`  ❌ Search API error for "${query}"`);
      continue;
    }
    
    totalResultsFound += searchResults.total;
    
    if (searchResults.total === 0) {
      continue;
    }
    
    if (verbose) {
      console.log(`  Found ${searchResults.total} results for "${query}"`);
    }
    
    // Find best match
    const { match, confidence } = findBestMatch(
      species.name,
      species.scientific_name,
      searchResults.data
    );
    
    if (match && confidence !== 'none') {
      // Keep the best match we've found
      if (!bestMatch || 
          (confidence === 'exact') ||
          (confidence === 'high' && bestMatch.confidence !== 'exact') ||
          (confidence === 'medium' && !['exact', 'high'].includes(bestMatch.confidence))) {
        bestMatch = { match, confidence, query };
        
        // Stop if we found an exact match
        if (confidence === 'exact') {
          break;
        }
      }
    }
  }
  
  if (!bestMatch || !bestMatch.match) {
    console.log(`  ⚠️  No match found (tried: ${searchVariations.join(', ')})`);
    await logSyncAttempt(
      species.slug, species.name, searchVariations.join('; '),
      totalResultsFound, null, null, 'none', 'unmatched'
    );
    stats.unmatched++;
    return;
  }
  
  const { match, confidence, query } = bestMatch;
  console.log(`  ✓ Matched: "${match.common_name}" (ID: ${match.id}, confidence: ${confidence}, via: "${query}")`);
  
  // Get full details
  const detail = await getSpeciesDetails(match.id);
  
  if (!detail) {
    console.log('  ❌ Failed to fetch details');
    await logSyncAttempt(
      species.slug, species.name, query,
      totalResultsFound, match.id, match.common_name, confidence as 'exact' | 'high' | 'medium' | 'low' | 'none', 'error',
      'Failed to fetch species details'
    );
    stats.errors++;
    return;
  }
  
  // Get care guides
  const careGuide = await getCareGuides(match.id);
  if (careGuide) {
    console.log(`  📖 Care guide fetched (${careGuide.section?.length || 0} sections)`);
    stats.careGuidesFetched++;
  }
  
  // Cache raw response
  await cachePerenualResponse(match.id, match.common_name, detail.scientific_name, detail, careGuide);
  
  // Update our database
  const updated = await updateSpeciesWithPerenualData(species.slug, match.id, detail, careGuide);
  
  if (updated) {
    console.log('  ✅ Database updated');
    await logSyncAttempt(
      species.slug, species.name, query,
      totalResultsFound, match.id, match.common_name, confidence as 'exact' | 'high' | 'medium' | 'low' | 'none', 'matched'
    );
    stats.matched++;
  } else {
    stats.errors++;
  }
}

async function main(): Promise<void> {
  console.log('🌱 Perenual Data Sync');
  console.log('=====================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Force resync: ${forceResync}`);
  if (singleSlug) console.log(`Single species: ${singleSlug}`);
  console.log('');
  
  const species = await fetchOurSpecies();
  
  if (species.length === 0) {
    console.log('No species to sync.');
    return;
  }
  
  console.log(`Found ${species.length} species to process`);
  
  const stats: SyncStats = {
    total: 0,
    matched: 0,
    unmatched: 0,
    errors: 0,
    skipped: 0,
    careGuidesFetched: 0,
  };
  
  for (const sp of species) {
    stats.total++;
    await syncSpecies(sp, stats);
  }
  
  // Print summary
  console.log('\n');
  console.log('📊 Sync Summary');
  console.log('===============');
  console.log(`Total processed: ${stats.total}`);
  console.log(`✅ Matched:      ${stats.matched}`);
  console.log(`⚠️  Unmatched:    ${stats.unmatched}`);
  console.log(`❌ Errors:       ${stats.errors}`);
  console.log(`📖 Care guides:  ${stats.careGuidesFetched}`);
  
  if (stats.unmatched > 0) {
    console.log('\n💡 Tip: Check perenual_sync_logs table for unmatched species');
  }
}

main().catch(console.error);
