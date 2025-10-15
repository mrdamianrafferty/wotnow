import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function mapSpeciesFrequencyToSpecies() {
  console.log('🔍 Mapping species_frequency IDs to Species Table\n');
  console.log('='.repeat(80));
  
  // Get all unique species from species_frequency with their temp/wind preferences
  console.log('\n📊 Analyzing species_frequency species...\n');
  
  const { data: freqSpecies, error: freqError } = await supabase
    .from('species_frequency')
    .select('species_id, optimal_temp_min, optimal_temp_max, optimal_wind_max')
    .limit(50000);
  
  if (freqError) {
    console.error('Error fetching frequency data:', freqError);
    return;
  }
  
  // Aggregate by species_id
  const speciesAggregated = new Map<string, {
    species_id: string;
    record_count: number;
    temp_ranges: { min: number; max: number }[];
    wind_max_values: number[];
  }>();
  
  freqSpecies?.forEach((record: any) => {
    const id = record.species_id;
    if (!speciesAggregated.has(id)) {
      speciesAggregated.set(id, {
        species_id: id,
        record_count: 0,
        temp_ranges: [],
        wind_max_values: []
      });
    }
    
    const agg = speciesAggregated.get(id)!;
    agg.record_count++;
    
    if (record.optimal_temp_min && record.optimal_temp_max) {
      agg.temp_ranges.push({
        min: record.optimal_temp_min,
        max: record.optimal_temp_max
      });
    }
    
    if (record.optimal_wind_max) {
      agg.wind_max_values.push(record.optimal_wind_max);
    }
  });
  
  console.log(`Found ${speciesAggregated.size} unique species in species_frequency\n`);
  
  // Now join with species table to get names
  const speciesIds = Array.from(speciesAggregated.keys());
  
  const { data: speciesInfo, error: speciesError } = await supabase
    .from('species')
    .select('id, species_code, name_en, scientific_name')
    .in('id', speciesIds);
  
  if (speciesError) {
    console.error('Error fetching species info:', speciesError);
    return;
  }
  
  console.log('='.repeat(80));
  console.log('📋 Species in species_frequency Table:\n');
  
  const mappedSpecies = speciesInfo?.map((species: any) => {
    const agg = speciesAggregated.get(species.id);
    
    // Calculate most common temp range
    const tempRanges = agg?.temp_ranges || [];
    const avgTempMin = tempRanges.length > 0
      ? tempRanges.reduce((sum, t) => sum + t.min, 0) / tempRanges.length
      : null;
    const avgTempMax = tempRanges.length > 0
      ? tempRanges.reduce((sum, t) => sum + t.max, 0) / tempRanges.length
      : null;
    
    // Calculate most common wind max
    const windValues = agg?.wind_max_values || [];
    const avgWindMax = windValues.length > 0
      ? windValues.reduce((sum, w) => sum + w, 0) / windValues.length
      : null;
    
    return {
      species_id: species.id,
      species_code: species.species_code,
      name_en: species.name_en,
      scientific_name: species.scientific_name,
      record_count: agg?.record_count || 0,
      avg_temp_min: avgTempMin ? avgTempMin.toFixed(1) : null,
      avg_temp_max: avgTempMax ? avgTempMax.toFixed(1) : null,
      avg_wind_max: avgWindMax ? avgWindMax.toFixed(1) : null,
      temp_range_count: tempRanges.length,
      wind_value_count: windValues.length
    };
  }).sort((a, b) => b.record_count - a.record_count);
  
  mappedSpecies?.forEach((species, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${species.name_en?.padEnd(25)} (${species.species_code || 'N/A'})`);
    console.log(`    Scientific: ${species.scientific_name}`);
    console.log(`    Records: ${species.record_count.toLocaleString()}`);
    if (species.avg_temp_min && species.avg_temp_max) {
      console.log(`    Temperature: ${species.avg_temp_min}-${species.avg_temp_max}°C (${species.temp_range_count} samples)`);
    }
    if (species.avg_wind_max) {
      console.log(`    Wind sensitivity: max ${species.avg_wind_max} knots (${species.wind_value_count} samples)`);
    }
    console.log();
  });
  
  // Check which of our 62 species have frequency data
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Coverage Analysis: Which of our 62 species have frequency data?\n');
  
  const { data: allOurSpecies } = await supabase
    .from('species')
    .select('id, species_code, name_en, scientific_name')
    .order('name_en');
  
  const freqSpeciesIds = new Set(speciesIds);
  
  const withFrequency = allOurSpecies?.filter(s => freqSpeciesIds.has(s.id)) || [];
  const withoutFrequency = allOurSpecies?.filter(s => !freqSpeciesIds.has(s.id)) || [];
  
  console.log(`✅ WITH frequency data: ${withFrequency.length} species`);
  withFrequency.forEach(s => {
    const agg = speciesAggregated.get(s.id);
    console.log(`   - ${s.name_en} (${s.species_code}) - ${agg?.record_count.toLocaleString()} records`);
  });
  
  console.log(`\n❌ WITHOUT frequency data: ${withoutFrequency.length} species`);
  withoutFrequency.forEach(s => {
    console.log(`   - ${s.name_en} (${s.species_code})`);
  });
  
  // Save to JSON
  const outputData = {
    generated_date: new Date().toISOString(),
    total_species_in_frequency: speciesAggregated.size,
    total_species_in_our_db: allOurSpecies?.length || 0,
    species_with_frequency: withFrequency.length,
    species_without_frequency: withoutFrequency.length,
    coverage_percentage: ((withFrequency.length / (allOurSpecies?.length || 1)) * 100).toFixed(1),
    mapped_species: mappedSpecies,
    species_with_frequency_data: withFrequency.map(s => ({
      ...s,
      record_count: speciesAggregated.get(s.id)?.record_count || 0
    })),
    species_without_frequency_data: withoutFrequency
  };
  
  const outputPath = 'SPECIES_FREQUENCY_COVERAGE_MATRIX.json';
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  
  console.log('\n' + '='.repeat(80));
  console.log(`✅ Coverage matrix saved to ${outputPath}\n`);
  
  // Summary statistics
  console.log('📈 Summary Statistics:\n');
  console.log(`Total species in our database: ${allOurSpecies?.length}`);
  console.log(`Species WITH frequency data: ${withFrequency.length} (${outputData.coverage_percentage}%)`);
  console.log(`Species WITHOUT frequency data: ${withoutFrequency.length} (${(100 - parseFloat(outputData.coverage_percentage)).toFixed(1)}%)`);
  
  // Temperature coverage
  const withTempData = mappedSpecies?.filter(s => s.avg_temp_min && s.avg_temp_max) || [];
  console.log(`\nSpecies with temperature data: ${withTempData.length}/${withFrequency.length} (${((withTempData.length / withFrequency.length) * 100).toFixed(1)}%)`);
  
  // Wind coverage
  const withWindData = mappedSpecies?.filter(s => s.avg_wind_max) || [];
  console.log(`Species with wind data: ${withWindData.length}/${withFrequency.length} (${((withWindData.length / withFrequency.length) * 100).toFixed(1)}%)`);
  
  // Check overlap with Phase 1 gates
  console.log('\n' + '='.repeat(80));
  console.log('🔗 Cross-Reference with Phase 1 Regional Gates:\n');
  
  try {
    const phase1Gates = JSON.parse(fs.readFileSync('SPECIES_PHASE1_REGIONAL_GATES.json', 'utf-8'));
    const gateSpeciesCodes = new Set(
      phase1Gates.regional_gates.map((g: any) => g.species_code)
    );
    
    const withBothGatesAndFreq = withFrequency.filter(s => 
      gateSpeciesCodes.has(s.species_code)
    );
    
    const withGatesNoFreq = withoutFrequency.filter(s => 
      gateSpeciesCodes.has(s.species_code)
    );
    
    console.log(`✅ Species with BOTH Phase 1 gates AND frequency data: ${withBothGatesAndFreq.length}`);
    withBothGatesAndFreq.forEach(s => {
      console.log(`   - ${s.name_en} (${s.species_code})`);
    });
    
    console.log(`\n⚠️ Species with Phase 1 gates but NO frequency data: ${withGatesNoFreq.length}`);
    if (withGatesNoFreq.length > 0) {
      console.log('   These will need environmental parameter research:');
      withGatesNoFreq.forEach(s => {
        console.log(`   - ${s.name_en} (${s.species_code})`);
      });
    }
    
  } catch (err) {
    console.log('   (Could not load Phase 1 gates file)');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 Next Steps:\n');
  console.log(`1. Use ${withFrequency.length} species for hybrid predictions (Phase 1 gates + frequency data)`);
  console.log(`2. Research environmental params for ${withoutFrequency.length} remaining species`);
  console.log('3. Build hybrid RPC function combining both approaches');
  console.log('4. Validate predictions against known catch reports\n');
}

mapSpeciesFrequencyToSpecies()
  .then(() => {
    console.log('✅ Mapping complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
