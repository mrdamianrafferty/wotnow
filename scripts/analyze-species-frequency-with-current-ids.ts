import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeFrequencySpecies() {
  console.log('🔍 Analyzing species_frequency IDs vs Current Species Table\n');
  console.log('='.repeat(80));

  // Get all unique species_ids from species_frequency
  const { data: freqSpecies } = await supabase
    .from('species_frequency')
    .select('species_id')
    .limit(10000);

  if (!freqSpecies) {
    console.error('❌ Could not fetch species_frequency data');
    return;
  }

  const uniqueFreqSpeciesIds = [...new Set(freqSpecies.map(r => r.species_id))];
  console.log(`\n📊 Found ${uniqueFreqSpeciesIds.length} unique species_ids in species_frequency:\n`);
  
  uniqueFreqSpeciesIds.forEach((id, idx) => {
    console.log(`${idx + 1}. ${id}`);
  });

  // Get all current species
  const { data: currentSpecies } = await supabase
    .from('species')
    .select('id, species_code, name_en, scientific_name');

  if (!currentSpecies) {
    console.error('❌ Could not fetch current species');
    return;
  }

  console.log(`\n\n📋 Current Species Table (62 species):\n`);
  currentSpecies.forEach((s, idx) => {
    console.log(`${idx + 1}. ${s.id} → ${s.name_en} (${s.species_code})`);
  });

  // Check for overlap
  console.log('\n\n🔗 Checking for ID Overlap...\n');
  console.log('='.repeat(80));

  const currentIds = new Set(currentSpecies.map(s => s.id));
  const overlappingIds = uniqueFreqSpeciesIds.filter(id => currentIds.has(id));

  if (overlappingIds.length > 0) {
    console.log(`\n✅ FOUND ${overlappingIds.length} OVERLAPPING IDs!\n`);
    overlappingIds.forEach(id => {
      const species = currentSpecies.find(s => s.id === id);
      console.log(`  ${id} → ${species?.name_en} (${species?.species_code})`);
    });
  } else {
    console.log('\n❌ ZERO OVERLAP - All species_frequency IDs are from OLD species table\n');
  }

  // Try to infer mapping by analyzing environmental data patterns
  console.log('\n\n🔬 Attempting to Infer Mapping by Environmental Characteristics...\n');
  console.log('='.repeat(80));

  // Get sample environmental data for each species_id in frequency table
  const speciesProfiles: any[] = [];
  
  for (const speciesId of uniqueFreqSpeciesIds.slice(0, 31)) {
    const { data: samples } = await supabase
      .from('species_frequency')
      .select('optimal_temp_min, optimal_temp_max, optimal_wind_max')
      .eq('species_id', speciesId)
      .limit(1);

    if (samples && samples.length > 0) {
      speciesProfiles.push({
        old_species_id: speciesId,
        temp_min: samples[0].optimal_temp_min,
        temp_max: samples[0].optimal_temp_max,
        wind_max: samples[0].optimal_wind_max,
      });
    }
  }

  console.log('\n📐 Environmental Profiles from species_frequency (OLD IDs):\n');
  speciesProfiles.forEach((profile, idx) => {
    console.log(`${idx + 1}. ID: ${profile.old_species_id.substring(0, 8)}...`);
    console.log(`   Temp: ${profile.temp_min}°C - ${profile.temp_max}°C`);
    console.log(`   Wind: ≤${profile.wind_max} knots\n`);
  });

  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    frequency_species_count: uniqueFreqSpeciesIds.length,
    current_species_count: currentSpecies.length,
    overlap_count: overlappingIds.length,
    frequency_species_ids: uniqueFreqSpeciesIds,
    current_species: currentSpecies.map(s => ({
      id: s.id,
      code: s.species_code,
      name: s.name_en,
      scientific_name: s.scientific_name,
    })),
    overlapping_species: overlappingIds.map(id => {
      const species = currentSpecies.find(s => s.id === id);
      return {
        id,
        code: species?.species_code,
        name: species?.name_en,
      };
    }),
    environmental_profiles: speciesProfiles,
  };

  fs.writeFileSync(
    'SPECIES_FREQUENCY_ID_ANALYSIS.json',
    JSON.stringify(results, null, 2)
  );

  console.log('\n\n💾 Results saved to SPECIES_FREQUENCY_ID_ANALYSIS.json');
  
  console.log('\n\n🎯 VERDICT:\n');
  console.log('='.repeat(80));
  
  if (overlappingIds.length > 0) {
    console.log(`✅ We CAN use species_frequency data for ${overlappingIds.length} species!`);
    console.log(`⚠️  We NEED to research ${currentSpecies.length - overlappingIds.length} species manually.`);
    console.log('\n📝 Next Step: Build hybrid approach using both data sources.');
  } else {
    console.log('❌ species_frequency uses completely different IDs from current species table.');
    console.log('\n📝 Options:');
    console.log('   1. Check if there are OTHER tables that link old IDs to new IDs');
    console.log('   2. Use environmental profiles to GUESS which old species = which new species');
    console.log('   3. Abandon species_frequency and research all 62 species manually');
    console.log('   4. Re-import species_frequency with correct species IDs from source data');
  }
}

analyzeFrequencySpecies()
  .then(() => process.exit(0))
  .catch(console.error);
