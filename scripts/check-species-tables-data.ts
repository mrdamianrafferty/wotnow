import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSpeciesTables() {
  console.log('🔍 Checking Species-Related Tables in Database\n');
  console.log('=' .repeat(80));
  
  // Check species_bio_bands
  console.log('\n📊 species_bio_bands table:');
  const { data: bioBands, error: bioBandsError, count: bioBandsCount } = await supabase
    .from('species_bio_bands')
    .select('*', { count: 'exact', head: true });
  
  if (bioBandsError) {
    console.log('   ❌ Error:', bioBandsError.message);
  } else {
    console.log(`   ✅ Found ${bioBandsCount} records`);
    
    // Get sample data
    const { data: sample } = await supabase
      .from('species_bio_bands')
      .select('*')
      .limit(5);
    
    if (sample && sample.length > 0) {
      console.log('\n   Sample records:');
      sample.forEach(r => {
        console.log(`   - species_id: ${r.species_id}, parameter: ${r.parameter}`);
        console.log(`     happy_bands: ${JSON.stringify(r.happy_bands)}`);
        console.log(`     unhappy_bands: ${JSON.stringify(r.unhappy_bands)}`);
      });
    }
  }
  
  // Check species_frequency
  console.log('\n\n📊 species_frequency table:');
  const { data: freq, error: freqError, count: freqCount } = await supabase
    .from('species_frequency')
    .select('*', { count: 'exact', head: true });
  
  if (freqError) {
    console.log('   ❌ Error:', freqError.message);
  } else {
    console.log(`   ✅ Found ${freqCount} records`);
    
    // Get sample data
    const { data: sample } = await supabase
      .from('species_frequency')
      .select('*')
      .limit(5);
    
    if (sample && sample.length > 0) {
      console.log('\n   Sample records:');
      sample.forEach(r => {
        console.log(`   - ${JSON.stringify(r)}`);
      });
    }
  }
  
  // Check species_monthly_abundance
  console.log('\n\n📊 species_monthly_abundance table:');
  const { data: abundance, error: abundanceError, count: abundanceCount } = await supabase
    .from('species_monthly_abundance')
    .select('*', { count: 'exact', head: true });
  
  if (abundanceError) {
    console.log('   ❌ Error:', abundanceError.message);
  } else {
    console.log(`   ✅ Found ${abundanceCount} records`);
    
    // Get sample data
    const { data: sample } = await supabase
      .from('species_monthly_abundance')
      .select('*')
      .limit(5);
    
    if (sample && sample.length > 0) {
      console.log('\n   Sample records:');
      sample.forEach(r => {
        console.log(`   - ${JSON.stringify(r)}`);
      });
    }
  }
  
  // Check species table columns
  console.log('\n\n📊 species table structure:');
  const { data: speciesSample } = await supabase
    .from('species')
    .select('*')
    .limit(1);
  
  if (speciesSample && speciesSample.length > 0) {
    console.log('   Columns:', Object.keys(speciesSample[0]).join(', '));
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('🎯 Summary:\n');
  console.log('Looking for original ICES species data that existed before DATRAS import.');
  console.log('DATRAS data (species_monthly_abundance) was added in migration 202509300001.');
  console.log('\nPotential original data sources:');
  console.log('- species_bio_bands: Environmental preference bands');
  console.log('- species_frequency: Historical species occurrence data?');
  console.log('- species.advice: Regional fishing advice (not from DATRAS)\n');
}

checkSpeciesTables()
  .then(() => {
    console.log('✅ Check complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
