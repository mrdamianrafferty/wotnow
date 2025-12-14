import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Count species with each type of care info
  const checks = [
    { name: 'watering', col: 'watering' },
    { name: 'sunlight (array)', col: 'sunlight' },
    { name: 'soil (array)', col: 'soil' },
    { name: 'care_level', col: 'care_level' },
    { name: 'maximum_height_cm', col: 'maximum_height_cm' },
    { name: 'poisonous_to_humans > 0', col: 'poisonous_to_humans' },
    { name: 'pest_susceptibility (array)', col: 'pest_susceptibility' },
    { name: 'attracts (array)', col: 'attracts' },
    // Original fields (before Perenual)
    { name: 'sun_requirements', col: 'sun_requirements' },
    { name: 'soil_type', col: 'soil_type' },
    { name: 'plant_size', col: 'plant_size' },
    { name: 'description', col: 'description' },
    { name: 'advice', col: 'advice' },
  ];

  console.log('=== Care Info Counts ===');
  
  for (const c of checks) {
    const { count } = await supabase
      .from('plant_species')
      .select('*', { count: 'exact', head: true })
      .not(c.col, 'is', null);
    console.log(`${c.name}: ${count || 0}`);
  }

  // Get a few example plants with watering info
  console.log('\n=== Plants with Watering Info ===');
  const { data: withWatering } = await supabase
    .from('plant_species')
    .select('name, watering')
    .not('watering', 'is', null)
    .limit(10);
  
  if (withWatering?.length) {
    withWatering.forEach(p => console.log(`- ${p.name}: ${p.watering}`));
  } else {
    console.log('None found');
  }

  // Get plants with any care arrays (sunlight, soil)
  console.log('\n=== Plants with Sunlight Array ===');
  const { data: withSunlight } = await supabase
    .from('plant_species')
    .select('name, sunlight')
    .not('sunlight', 'is', null)
    .limit(10);
  
  if (withSunlight?.length) {
    const filtered = withSunlight.filter(p => p.sunlight?.length > 0);
    filtered.forEach(p => console.log(`- ${p.name}: ${JSON.stringify(p.sunlight)}`));
    if (!filtered.length) console.log('None with non-empty arrays');
  } else {
    console.log('None found');
  }
}

main().catch(console.error);
