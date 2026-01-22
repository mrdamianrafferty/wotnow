/**
 * Normalizes plant_species data for consistency.
 *
 * Run with: npx tsx --env-file=.env.local scripts/normalize-plant-data.ts
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

// Normalize array values to lowercase
function normalizeArray(arr: string[] | null | undefined): string[] | null {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
  return arr.map(item =>
    typeof item === 'string' ? item.toLowerCase().trim() : item
  );
}

// Check if arrays are different (need update)
function arraysNeedNormalization(
  arr: string[] | null | undefined
): boolean {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return false;
  return arr.some(
    item => typeof item === 'string' && item !== item.toLowerCase().trim()
  );
}

interface PlantRow {
  slug: string;
  sunlight: string[] | null;
  soil: string[] | null;
  attracts: string[] | null;
  pest_susceptibility: string[] | null;
  propagation: string[] | null;
  perenual_other_names: string[] | null;
  fruit_color: string[] | null;
  leaf_color: string[] | null;
}

interface NormalizationUpdate {
  sunlight?: string[];
  soil?: string[];
  attracts?: string[];
  pest_susceptibility?: string[];
  propagation?: string[];
  perenual_other_names?: string[];
  fruit_color?: string[];
  leaf_color?: string[];
}

async function main() {
  console.log('=== Plant Data Normalization ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'EXECUTE (updating database)'}`);
  if (limit) console.log(`Limit: ${limit} records`);
  console.log('');

  // Fetch all plants with array fields
  let query = supabase
    .from('plant_species')
    .select('slug, sunlight, soil, attracts, pest_susceptibility, propagation, perenual_other_names, fruit_color, leaf_color');

  if (limit) query = query.limit(limit);

  const { data: plants, error } = await query;

  if (error) {
    console.error('Error fetching plants:', error.message);
    process.exit(1);
  }

  if (!plants || plants.length === 0) {
    console.log('No plants found.');
    return;
  }

  console.log(`Found ${plants.length} plants to check.\n`);

  const arrayFields: (keyof PlantRow)[] = [
    'sunlight',
    'soil',
    'attracts',
    'pest_susceptibility',
    'propagation',
    'perenual_other_names',
    'fruit_color',
    'leaf_color',
  ];

  let normalized = 0;
  let skipped = 0;
  let failed = 0;

  // Track field-level stats
  const fieldStats: Record<string, number> = {};
  arrayFields.forEach(f => (fieldStats[f] = 0));

  for (const plant of plants as PlantRow[]) {
    const update: NormalizationUpdate = {};
    let needsUpdate = false;

    for (const field of arrayFields) {
      const value = plant[field] as string[] | null;
      if (arraysNeedNormalization(value)) {
        const normalized = normalizeArray(value);
        if (normalized) {
          (update as Record<string, unknown>)[field] = normalized;
          needsUpdate = true;
          fieldStats[field]++;
        }
      }
    }

    if (!needsUpdate) {
      skipped++;
      continue;
    }

    const fieldsToUpdate = Object.keys(update);

    if (dryRun) {
      console.log(`📝 Would normalize ${plant.slug}:`);
      for (const field of fieldsToUpdate) {
        const original = plant[field as keyof PlantRow] as string[];
        const normalized = update[field as keyof NormalizationUpdate];
        console.log(`   ${field}: ${JSON.stringify(original)} → ${JSON.stringify(normalized)}`);
      }
      normalized++;
    } else {
      const { error: updateError } = await supabase
        .from('plant_species')
        .update(update)
        .eq('slug', plant.slug);

      if (updateError) {
        console.error(`❌ Failed to update ${plant.slug}:`, updateError.message);
        failed++;
      } else {
        console.log(`✅ Normalized ${plant.slug} (${fieldsToUpdate.join(', ')})`);
        normalized++;
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`${dryRun ? 'Would normalize' : 'Normalized'}: ${normalized}`);
  console.log(`Already clean: ${skipped}`);
  if (failed > 0) console.log(`Failed: ${failed}`);

  console.log('\n=== Field Breakdown ===');
  for (const [field, count] of Object.entries(fieldStats)) {
    if (count > 0) {
      console.log(`  ${field}: ${count} plants`);
    }
  }

  if (dryRun && normalized > 0) {
    console.log('\nRun with --execute to apply changes.');
  }
}

main().catch(console.error);
