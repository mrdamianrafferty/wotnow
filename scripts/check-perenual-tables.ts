import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const s = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Get a sample from perenual_details_stage
  console.log('=== perenual_details_stage sample ===');
  const { data: stagingSample, error: stagingErr } = await s
    .from('perenual_details_stage')
    .select('*')
    .limit(1);

  if (stagingErr) {
    console.error('Staging table error:', stagingErr.message);
  } else if (stagingSample && stagingSample.length > 0) {
    console.log('Columns:', Object.keys(stagingSample[0]).join(', '));
    console.log('\nSample row:');
    console.log(JSON.stringify(stagingSample[0], null, 2));
  }

  // Count staging records
  const { count: stagingCount } = await s
    .from('perenual_details_stage')
    .select('*', { count: 'exact', head: true });
  console.log('\nTotal staging records:', stagingCount);

  // Get plant_species perenual columns
  console.log('\n=== plant_species perenual-related columns ===');
  const { data: speciesSample, error: speciesErr } = await s
    .from('plant_species')
    .select('slug, perenual_id, perenual_family, perenual_other_names, growth_rate, maintenance, watering, care_level, sunlight, soil, flowers, fruits, leaf, medicinal, poisonous_to_humans, poisonous_to_pets, perenual_last_synced_at')
    .not('perenual_id', 'is', null)
    .limit(1);

  if (speciesErr) {
    console.error('Species table error:', speciesErr.message);
  } else if (speciesSample && speciesSample.length > 0) {
    console.log('Sample plant_species perenual data:');
    console.log(JSON.stringify(speciesSample[0], null, 2));
  }

  // Count species with perenual_id
  const { count: withPerenual } = await s
    .from('plant_species')
    .select('*', { count: 'exact', head: true })
    .not('perenual_id', 'is', null);

  const { count: totalSpecies } = await s
    .from('plant_species')
    .select('*', { count: 'exact', head: true });

  console.log('\nplant_species with perenual_id:', withPerenual, '/', totalSpecies);

  // Check how many staging records can be matched
  const { data: matchable, error: matchErr } = await s
    .from('perenual_details_stage')
    .select('id');

  if (matchErr) {
    console.error('Match error:', matchErr.message);
  } else if (matchable) {
    const ids = matchable.map((r: { id: number }) => r.id);
    const { count: matchCount } = await s
      .from('plant_species')
      .select('*', { count: 'exact', head: true })
      .in('perenual_id', ids);
    console.log('\nStaging records that match plant_species:', matchCount, '/', ids.length);
  }
}

main().catch(console.error);
