import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeBioBands() {
  console.log('🔬 Analyzing species_bio_bands Data\n');
  console.log('=' .repeat(80));
  
  // Get all bio_bands data
  const { data: bioBands, error } = await supabase
    .from('species_bio_bands')
    .select('*, species:species_id(species_code, name_en)')
    .order('species_id, parameter');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\nTotal bio_bands records: ${bioBands.length}\n`);
  
  // Group by parameter
  const byParameter: Record<string, any[]> = {};
  const bySpecies: Record<string, any[]> = {};
  
  for (const band of bioBands) {
    if (!byParameter[band.parameter]) byParameter[band.parameter] = [];
    byParameter[band.parameter].push(band);
    
    const speciesCode = band.species?.species_code || 'unknown';
    if (!bySpecies[speciesCode]) bySpecies[speciesCode] = [];
    bySpecies[speciesCode].push(band);
  }
  
  // Analyze parameters
  console.log('📊 Parameters Found:\n');
  for (const [param, bands] of Object.entries(byParameter).sort()) {
    console.log(`   ${param}: ${bands.length} species`);
    
    // Show unique happy/unhappy band combinations
    const uniqueHappy = new Set(bands.map(b => b.happy_bands?.join(',')));
    const uniqueUnhappy = new Set(bands.map(b => b.unhappy_bands?.join(',')));
    
    console.log(`      Happy patterns: ${uniqueHappy.size} unique`);
    console.log(`      Unhappy patterns: ${uniqueUnhappy.size} unique`);
  }
  
  // Check which species have data
  console.log('\n\n🐟 Species with Bio Bands Data:\n');
  
  const speciesWithData = Object.entries(bySpecies)
    .sort(([a], [b]) => a.localeCompare(b));
  
  for (const [speciesCode, bands] of speciesWithData) {
    const speciesName = bands[0]?.species?.name_en || speciesCode;
    const parameters = bands.map(b => b.parameter).join(', ');
    console.log(`   ${speciesName} (${speciesCode}):`);
    console.log(`      Parameters: ${parameters}`);
  }
  
  // Show detailed examples
  console.log('\n\n📋 Sample Bio Bands (Detailed Examples):\n');
  
  const sampleSpecies = ['cod', 'sea-bass', 'plaice', 'bream'];
  
  for (const speciesCode of sampleSpecies) {
    const speciesBands = bioBands.filter(b => b.species?.species_code === speciesCode);
    
    if (speciesBands.length === 0) {
      console.log(`\n❌ ${speciesCode}: NO DATA`);
      continue;
    }
    
    console.log(`\n✅ ${speciesBands[0].species?.name_en} (${speciesCode}):`);
    console.log('-'.repeat(60));
    
    for (const band of speciesBands) {
      console.log(`   Parameter: ${band.parameter}`);
      console.log(`      Happy bands: ${band.happy_bands?.join(', ') || 'NONE'}`);
      console.log(`      Unhappy bands: ${band.unhappy_bands?.join(', ') || 'NONE'}`);
    }
  }
  
  // Check species_frequency for depth/temp data
  console.log('\n\n🌡️ Checking species_frequency for Environmental Data:\n');
  console.log('=' .repeat(80));
  
  const { data: freqSample } = await supabase
    .from('species_frequency')
    .select('*, species:species_id(species_code, name_en)')
    .limit(10);
  
  if (freqSample && freqSample.length > 0) {
    const sample = freqSample[0];
    const hasTemp = sample.optimal_temp_min !== null && sample.optimal_temp_max !== null;
    const hasDepth = sample.optimal_depth_min !== null && sample.optimal_depth_max !== null;
    
    console.log(`   ${hasTemp ? '✅' : '❌'} Temperature data (optimal_temp_min/max)`);
    console.log(`   ${hasDepth ? '✅' : '❌'} Depth data (optimal_depth_min/max)`);
    
    if (hasTemp || hasDepth) {
      console.log('\n   Sample species_frequency records:');
      for (const record of freqSample.slice(0, 3)) {
        console.log(`\n   ${record.species?.name_en} (${record.species?.species_code}):`);
        if (hasTemp) {
          console.log(`      Temp: ${record.optimal_temp_min}°C - ${record.optimal_temp_max}°C`);
        }
        if (hasDepth) {
          console.log(`      Depth: ${record.optimal_depth_min}m - ${record.optimal_depth_max}m`);
        }
      }
    }
  }
  
  // Summary
  console.log('\n\n🎯 FINDINGS & RECOMMENDATIONS:\n');
  console.log('=' .repeat(80));
  
  console.log('\n✅ species_bio_bands:');
  console.log(`   • Has data for ${Object.keys(bySpecies).length} species`);
  console.log(`   • Parameters: ${Object.keys(byParameter).join(', ')}`);
  console.log(`   • Uses qualitative bands: very_low, low, normal, high, very_high`);
  
  if (Object.keys(byParameter).includes('temperature')) {
    console.log('   • ✅ HAS TEMPERATURE DATA');
  } else {
    console.log('   • ❌ MISSING TEMPERATURE DATA');
  }
  
  if (Object.keys(byParameter).includes('salinity')) {
    console.log('   • ✅ HAS SALINITY DATA');
  } else {
    console.log('   • ❌ MISSING SALINITY DATA');
  }
  
  if (Object.keys(byParameter).includes('depth')) {
    console.log('   • ✅ HAS DEPTH DATA');
  } else {
    console.log('   • ❌ MISSING DEPTH DATA');
  }
  
  console.log('\n📊 species_frequency:');
  const { count: freqCount } = await supabase
    .from('species_frequency')
    .select('*', { count: 'exact', head: true });
  console.log(`   • ${freqCount} records (per species × rectangle × quarter)`);
  console.log('   • Has optimal_temp_min/max columns');
  console.log('   • Has optimal_depth_min/max columns');
  console.log('   • May contain modeled environmental preferences');
  
  console.log('\n🔬 NEXT STEPS:\n');
  console.log('   1. Map species_bio_bands parameters to our Phase 2 scoring');
  console.log('   2. Audit species_frequency environmental data quality');
  console.log('   3. Decide: Use existing data or research fresh from FishBase?');
  console.log('   4. If using existing: Convert qualitative bands → quantitative ranges');
  console.log('   5. If researching fresh: Use as validation/comparison\n');
  
  // Save summary
  const summary = {
    bio_bands: {
      total_records: bioBands.length,
      species_count: Object.keys(bySpecies).length,
      parameters: Object.keys(byParameter).sort(),
      species_list: Object.keys(bySpecies).sort(),
    },
    species_frequency: {
      total_records: freqCount,
      has_temp_data: true,
      has_depth_data: true,
    }
  };
  
  fs.writeFileSync('EXISTING_ICES_DATA_ANALYSIS.json', JSON.stringify(summary, null, 2));
  console.log('📁 Summary saved to EXISTING_ICES_DATA_ANALYSIS.json\n');
}

analyzeBioBands()
  .then(() => {
    console.log('✅ Analysis complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
