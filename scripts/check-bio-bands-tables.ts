import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBioBandsTables() {
  console.log('🔍 Checking for bio-bands related tables...\n');
  
  // Check for possible threshold table names
  const possibleNames = [
    'bio_bands',
    'bio_bands_thresholds', 
    'bio_level_thresholds',
    'environmental_thresholds',
    'parameter_thresholds',
    'bio_level'
  ];
  
  for (const tableName of possibleNames) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(5);
    
    if (!error) {
      console.log(`✅ Found table: ${tableName}`);
      console.log(`   Records: ${data?.length || 0}`);
      if (data && data.length > 0) {
        console.log('   Sample records:');
        data.forEach((record, idx) => {
          console.log(`   [${idx + 1}]`, JSON.stringify(record));
        });
      }
      console.log('');
    }
  }
  
  // Also check the species_bio_bands table structure more carefully
  console.log('\n📊 species_bio_bands table details:\n');
  const { data: bioBands, error: bioBandsError } = await supabase
    .from('species_bio_bands')
    .select('species_id, parameter, happy_bands, unhappy_bands')
    .limit(20);
  
  if (!bioBandsError && bioBands) {
    console.log(`Total records checked: ${bioBands.length}`);
    
    // Group by species
    const speciesMap = new Map();
    for (const band of bioBands) {
      if (!speciesMap.has(band.species_id)) {
        speciesMap.set(band.species_id, []);
      }
      speciesMap.get(band.species_id).push(band.parameter);
    }
    
    console.log(`\nSpecies with bio-bands data: ${speciesMap.size}`);
    console.log('Parameters found:', [...new Set(bioBands.map(b => b.parameter))].join(', '));
  }
}

checkBioBandsTables()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
