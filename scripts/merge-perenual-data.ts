/**
 * Merges data from perenual_details_stage into plant_species table.
 *
 * Run with: npx tsx --env-file=.env.local scripts/merge-perenual-data.ts
 *
 * Options:
 *   --dry-run    Preview changes without updating (default)
 *   --execute    Actually perform the updates
 *   --limit=N    Process only N records (for testing)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse command line args
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
const limitMatch = args.find(a => a.startsWith('--limit='));
const limit = limitMatch ? parseInt(limitMatch.split('=')[1]) : null;

// Helper to safely parse JSON strings
function parseJsonString<T>(val: string | null | undefined): T | null {
  if (val === null || val === undefined || val === '') return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

// Helper to parse boolean string
function parseBoolString(val: string | null | undefined): boolean | null {
  if (val === null || val === undefined) return null;
  const lower = val.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  return null;
}

// Helper to parse number string
function parseNumString(val: string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

// Helper to convert month names to numbers
const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  'january': 1, 'jan': 1,
  'february': 2, 'feb': 2,
  'march': 3, 'mar': 3,
  'april': 4, 'apr': 4,
  'may': 5,
  'june': 6, 'jun': 6,
  'july': 7, 'jul': 7,
  'august': 8, 'aug': 8,
  'september': 9, 'sep': 9, 'sept': 9,
  'october': 10, 'oct': 10,
  'november': 11, 'nov': 11,
  'december': 12, 'dec': 12,
};

function parseMonthNamesToNumbers(monthNames: string[]): number[] {
  const numbers = new Set<number>();
  for (const name of monthNames) {
    const num = MONTH_NAME_TO_NUMBER[name.toLowerCase().trim()];
    if (num) {
      numbers.add(num);
    }
  }
  // Return sorted, unique month numbers
  return Array.from(numbers).sort((a, b) => a - b);
}

interface StagingRow {
  perenual_id: number;
  perenual_common_name: string | null;
  perenual_scientific_name: string | null;
  perenual_other_names: string | null;
  perenual_family: string | null;
  genus: string | null;
  type: string | null;
  cycle: string | null;
  sunlight: string | null;
  soil: string | null;
  watering: string | null;
  watering_general_benchmark: string | null;
  watering_period: string | null;
  care_level: string | null;
  growth_rate: string | null;
  maintenance: string | null;
  drought_tolerant: string | null;
  salt_tolerant: string | null;
  thorny: string | null;
  invasive: string | null;
  tropical: string | null;
  indoor: string | null;
  seeds: string | null;
  fruits: string | null;
  cones: string | null;
  flowers: string | null;
  leaf: string | null;
  cuisine: string | null;
  medicinal: string | null;
  poisonous_to_humans: string | null;
  poisonous_to_pets: string | null;
  edible_fruit: string | null;
  edible_leaf: string | null;
  harvest_season: string | null;
  flowering_season: string | null;
  flower_color: string | null;
  fruit_color: string | null;
  leaf_color: string | null;
  attracts: string | null;
  pest_susceptibility: string | null;
  propagation: string | null;
  pruning_month: string | null;
  hardiness_min: string | null;
  hardiness_max: string | null;
  hardiness_location: string | null;
  dimensions: string | null;
  default_image: string | null;
  other_images: string | null;
  description: string | null;
  origin: string | null;
  care_guides: string | null;
}

interface PlantSpeciesUpdate {
  // Strings
  perenual_family?: string | null;
  genus?: string | null;
  watering?: string | null;
  care_level?: string | null;
  growth_rate?: string | null;
  maintenance?: string | null;
  harvest_season?: string | null;
  flowering_season?: string | null;
  flower_color?: string | null;

  // Booleans
  drought_tolerant?: boolean | null;
  salt_tolerant?: boolean | null;
  thorny?: boolean | null;
  invasive?: boolean | null;
  tropical?: boolean | null;
  indoor?: boolean | null;
  fruits?: boolean | null;
  cones?: boolean | null;
  flowers?: boolean | null;
  leaf?: boolean | null;
  cuisine?: boolean | null;
  medicinal?: boolean | null;
  edible_fruit?: boolean | null;
  edible_leaf?: boolean | null;

  // Integers (not booleans in DB schema!)
  seeds?: number | null; // INTEGER in DB
  poisonous_to_humans?: number | null; // INTEGER (0-5 severity)
  poisonous_to_pets?: number | null; // INTEGER (0-5 severity)
  hardiness_min?: number | null;
  hardiness_max?: number | null;

  // Arrays
  perenual_other_names?: string[] | null;
  sunlight?: string[] | null;
  soil?: string[] | null;
  attracts?: string[] | null;
  pest_susceptibility?: string[] | null;
  propagation?: string[] | null;
  pruning_months?: number[] | null; // INTEGER[] - month numbers 1-12
  fruit_color?: string[] | null; // TEXT[] in DB
  leaf_color?: string[] | null; // TEXT[] in DB

  // Objects
  watering_general_benchmark?: Record<string, unknown> | null;
  hardiness_location?: Record<string, unknown> | null;
  dimensions?: unknown[] | null;
  perenual_default_image?: Record<string, unknown> | null;
  care_guides?: unknown[] | null;

  // Timestamp
  perenual_last_synced_at?: string;
}

function transformStagingToUpdate(staging: StagingRow): PlantSpeciesUpdate {
  const update: PlantSpeciesUpdate = {};

  // String fields (only update if staging has value)
  if (staging.perenual_family) update.perenual_family = staging.perenual_family;
  if (staging.genus) update.genus = staging.genus;
  if (staging.watering) update.watering = staging.watering;
  if (staging.care_level) update.care_level = staging.care_level;
  if (staging.growth_rate) update.growth_rate = staging.growth_rate;
  if (staging.maintenance) update.maintenance = staging.maintenance;
  if (staging.harvest_season) update.harvest_season = staging.harvest_season;
  if (staging.flowering_season) update.flowering_season = staging.flowering_season;
  if (staging.flower_color) update.flower_color = staging.flower_color;

  // Boolean fields - these are BOOLEAN in DB schema
  const boolFields: Array<[keyof StagingRow, keyof PlantSpeciesUpdate]> = [
    ['drought_tolerant', 'drought_tolerant'],
    ['salt_tolerant', 'salt_tolerant'],
    ['thorny', 'thorny'],
    ['invasive', 'invasive'],
    ['tropical', 'tropical'],
    ['indoor', 'indoor'],
    ['fruits', 'fruits'],
    ['cones', 'cones'],
    ['flowers', 'flowers'],
    ['leaf', 'leaf'],
    ['cuisine', 'cuisine'],
    ['medicinal', 'medicinal'],
    ['edible_fruit', 'edible_fruit'],
    ['edible_leaf', 'edible_leaf'],
  ];

  for (const [srcKey, destKey] of boolFields) {
    const val = parseBoolString(staging[srcKey] as string | null);
    if (val !== null) {
      (update as Record<string, unknown>)[destKey] = val;
    }
  }

  // Integer fields - these are INTEGER in DB schema, not BOOLEAN!
  // seeds: convert "true"/"false" to 1/0
  const seedsVal = parseBoolString(staging.seeds);
  if (seedsVal !== null) update.seeds = seedsVal ? 1 : 0;

  // poisonous_to_humans/pets: convert "true" to 1 (mild toxicity), "false" to 0 (safe)
  const poisonousHumans = parseBoolString(staging.poisonous_to_humans);
  if (poisonousHumans !== null) update.poisonous_to_humans = poisonousHumans ? 1 : 0;

  const poisonousPets = parseBoolString(staging.poisonous_to_pets);
  if (poisonousPets !== null) update.poisonous_to_pets = poisonousPets ? 1 : 0;

  // Number fields
  const hardinessMin = parseNumString(staging.hardiness_min);
  const hardinessMax = parseNumString(staging.hardiness_max);
  if (hardinessMin !== null) update.hardiness_min = hardinessMin;
  if (hardinessMax !== null) update.hardiness_max = hardinessMax;

  // Array fields (parse JSON strings)
  const perenualOtherNames = parseJsonString<string[]>(staging.perenual_other_names);
  if (perenualOtherNames && perenualOtherNames.length > 0) {
    update.perenual_other_names = perenualOtherNames;
  }

  const sunlight = parseJsonString<string[]>(staging.sunlight);
  if (sunlight && sunlight.length > 0) update.sunlight = sunlight;

  const soil = parseJsonString<string[]>(staging.soil);
  if (soil && soil.length > 0) update.soil = soil;

  const attracts = parseJsonString<string[]>(staging.attracts);
  if (attracts && attracts.length > 0) update.attracts = attracts;

  const pestSusceptibility = parseJsonString<string[]>(staging.pest_susceptibility);
  if (pestSusceptibility && pestSusceptibility.length > 0) {
    update.pest_susceptibility = pestSusceptibility;
  }

  const propagation = parseJsonString<string[]>(staging.propagation);
  if (propagation && propagation.length > 0) update.propagation = propagation;

  // Convert month names to numbers for pruning_months
  const pruningMonthNames = parseJsonString<string[]>(staging.pruning_month);
  if (pruningMonthNames && pruningMonthNames.length > 0) {
    const pruningMonthNumbers = parseMonthNamesToNumbers(pruningMonthNames);
    if (pruningMonthNumbers.length > 0) {
      update.pruning_months = pruningMonthNumbers;
    }
  }

  // Color arrays (fruit_color and leaf_color are TEXT[] in DB)
  // Note: staging might have these as null or JSON arrays
  if (staging.fruit_color) {
    const fruitColor = parseJsonString<string[]>(staging.fruit_color);
    if (fruitColor && fruitColor.length > 0) {
      update.fruit_color = fruitColor;
    } else if (typeof staging.fruit_color === 'string' && staging.fruit_color !== 'null') {
      // Single string value - wrap in array
      update.fruit_color = [staging.fruit_color];
    }
  }

  if (staging.leaf_color) {
    const leafColor = parseJsonString<string[]>(staging.leaf_color);
    if (leafColor && leafColor.length > 0) {
      update.leaf_color = leafColor;
    } else if (typeof staging.leaf_color === 'string' && staging.leaf_color !== 'null') {
      // Single string value - wrap in array
      update.leaf_color = [staging.leaf_color];
    }
  }

  // Object fields (parse JSON strings)
  const wateringBenchmark = parseJsonString<Record<string, unknown>>(staging.watering_general_benchmark);
  if (wateringBenchmark) update.watering_general_benchmark = wateringBenchmark;

  const hardinessLocation = parseJsonString<Record<string, unknown>>(staging.hardiness_location);
  if (hardinessLocation) update.hardiness_location = hardinessLocation;

  const dimensions = parseJsonString<unknown[]>(staging.dimensions);
  if (dimensions && dimensions.length > 0) update.dimensions = dimensions;

  const defaultImage = parseJsonString<Record<string, unknown>>(staging.default_image);
  if (defaultImage) update.perenual_default_image = defaultImage;

  const careGuides = parseJsonString<unknown[]>(staging.care_guides);
  if (careGuides && careGuides.length > 0) update.care_guides = careGuides;

  // Update sync timestamp
  update.perenual_last_synced_at = new Date().toISOString();

  return update;
}

async function main() {
  console.log('=== Perenual Data Merge ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'EXECUTE (updating database)'}`);
  if (limit) console.log(`Limit: ${limit} records`);
  console.log('');

  // Fetch all staging records
  let query = supabase.from('perenual_details_stage').select('*');
  if (limit) query = query.limit(limit);

  const { data: stagingRows, error: stagingError } = await query;

  if (stagingError) {
    console.error('Error fetching staging data:', stagingError.message);
    process.exit(1);
  }

  if (!stagingRows || stagingRows.length === 0) {
    console.log('No staging records found.');
    return;
  }

  console.log(`Found ${stagingRows.length} staging records to process.\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const staging of stagingRows as StagingRow[]) {
    const perenualId = staging.perenual_id;

    // Check if plant_species exists with this perenual_id
    const { data: existing, error: fetchError } = await supabase
      .from('plant_species')
      .select('slug, perenual_id, perenual_family, care_level, growth_rate')
      .eq('perenual_id', perenualId)
      .single();

    if (fetchError || !existing) {
      console.log(`⏭️  Skipped perenual_id=${perenualId} (no matching plant_species)`);
      skipped++;
      continue;
    }

    // Transform staging data to update format
    const updateData = transformStagingToUpdate(staging);

    // Count non-timestamp fields being updated
    const fieldCount = Object.keys(updateData).filter(k => k !== 'perenual_last_synced_at').length;

    if (fieldCount === 0) {
      console.log(`⏭️  Skipped ${existing.slug} (no new data)`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`📝 Would update ${existing.slug}:`);
      console.log(`   Fields: ${Object.keys(updateData).filter(k => k !== 'perenual_last_synced_at').join(', ')}`);
      updated++;
    } else {
      const { error: updateError } = await supabase
        .from('plant_species')
        .update(updateData)
        .eq('perenual_id', perenualId);

      if (updateError) {
        console.error(`❌ Failed to update ${existing.slug}:`, updateError.message);
        failed++;
      } else {
        console.log(`✅ Updated ${existing.slug} (${fieldCount} fields)`);
        updated++;
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`${dryRun ? 'Would update' : 'Updated'}: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  if (failed > 0) console.log(`Failed: ${failed}`);

  if (dryRun) {
    console.log('\nRun with --execute to apply changes.');
  }
}

main().catch(console.error);
