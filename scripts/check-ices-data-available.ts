import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkICESData() {
  console.log('🔍 Checking Available ICES & DATRAS Data\n');
  console.log('=' .repeat(80));
  
  // Check tables
  const tables = [
    'ices_rectangles',
    'species_monthly_abundance',
    'species_frequency',
    'species_bio_bands'
  ];
  
  for (const table of tables) {
    console.log(`\n📊 Table: ${table}`);
    console.log('-'.repeat(60));
    
    try {
      // Get count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.log(`   ❌ Error: ${countError.message}`);
        continue;
      }
      
      console.log(`   Total rows: ${count}`);
      
      // Get sample data
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(3);
      
      if (error) {
        console.log(`   ❌ Error fetching sample: ${error.message}`);
        continue;
      }
      
      if (data && data.length > 0) {
        console.log(`   Sample columns: ${Object.keys(data[0]).join(', ')}`);
        
        // Special handling for each table
        if (table === 'ices_rectangles' && data.length > 0) {
          const rect = data[0];
          console.log(`   Example: ${rect.rectangle_code} - ${rect.region || 'N/A'}`);
          if (rect.biogeo_zone) console.log(`   Biogeo zones available: Yes`);
          if (rect.depth_min !== undefined) console.log(`   Depth data available: Yes`);
        }
        
        if (table === 'species_monthly_abundance' && data.length > 0) {
          const sma = data[0];
          console.log(`   Example: ${sma.rectangle_code} - ${sma.species_id}`);
          console.log(`   Monthly data: Jan=${sma.jan}, Feb=${sma.feb}, ...`);
        }
        
        if (table === 'species_frequency' && data.length > 0) {
          const sf = data[0];
          console.log(`   Has week/quarter data: Yes`);
          console.log(`   Columns: ${Object.keys(sf).slice(0, 10).join(', ')}...`);
        }
        
        if (table === 'species_bio_bands' && data.length > 0) {
          const bb = data[0];
          console.log(`   Parameter: ${bb.parameter}`);
          console.log(`   Happy bands: ${bb.happy_bands?.join(', ') || 'N/A'}`);
          console.log(`   Unhappy bands: ${bb.unhappy_bands?.join(', ') || 'N/A'}`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Unexpected error: ${err}`);
    }
  }
  
  // Check for ICES stock assessment data
  console.log('\n\n📋 Checking for Additional ICES Data Sources\n');
  console.log('=' .repeat(80));
  
  // Check ices_rectangles for useful columns
  console.log('\n🌍 ICES Rectangles - Available Data:');
  const { data: rectSample } = await supabase
    .from('ices_rectangles')
    .select('*')
    .limit(1)
    .single();
  
  if (rectSample) {
    const hasColumns = {
      'Biogeo Zone': !!rectSample.biogeo_zone,
      'Region': !!rectSample.region,
      'Depth Data': rectSample.depth_min !== undefined,
      'Substrate': !!rectSample.substrate,
      'Distance to Shore': rectSample.distance_to_shore_km !== undefined,
      'Coastal Flag': rectSample.is_coastal !== undefined,
    };
    
    for (const [key, value] of Object.entries(hasColumns)) {
      console.log(`   ${value ? '✅' : '❌'} ${key}`);
    }
  }
  
  // Check species_monthly_abundance quality
  console.log('\n\n📈 DATRAS Monthly Abundance - Data Quality:');
  const { data: smaData } = await supabase
    .from('species_monthly_abundance')
    .select('rectangle_code, species_id')
    .limit(1000);
  
  if (smaData) {
    const uniqueRectangles = new Set(smaData.map(d => d.rectangle_code));
    const uniqueSpecies = new Set(smaData.map(d => d.species_id));
    
    console.log(`   Total unique rectangles: ${uniqueRectangles.size}`);
    console.log(`   Total unique species: ${uniqueSpecies.size}`);
    console.log(`   Expected combinations: ${uniqueRectangles.size * uniqueSpecies.size}`);
    console.log(`   Actual records: ${smaData.length}`);
    
    if (uniqueRectangles.size > 0 && uniqueSpecies.size > 0) {
      const expectedCombos = uniqueRectangles.size * uniqueSpecies.size;
      const coverage = (smaData.length / expectedCombos * 100).toFixed(1);
      console.log(`   Coverage: ${coverage}%`);
      
      if (coverage === '100.0') {
        console.log('   ⚠️ WARNING: Perfect coverage suggests all rectangles have all species (no filtering)');
      }
    }
  }
  
  // Check species_frequency
  console.log('\n\n📊 Species Frequency - Data Quality:');
  const { data: sfData, count: sfCount } = await supabase
    .from('species_frequency')
    .select('*', { count: 'exact' })
    .limit(100);
  
  if (sfData && sfData.length > 0) {
    console.log(`   Total records: ${sfCount}`);
    
    const sample = sfData[0];
    const hasWeeklyData = sample.week_number !== undefined;
    const hasQuarterData = sample.quarter !== undefined;
    const hasProbability = sample.presence_probability !== undefined;
    
    console.log(`   ${hasWeeklyData ? '✅' : '❌'} Weekly data`);
    console.log(`   ${hasQuarterData ? '✅' : '❌'} Quarterly data`);
    console.log(`   ${hasProbability ? '✅' : '❌'} Presence probability`);
    
    if (hasProbability) {
      const probabilities = sfData.map(d => d.presence_probability).filter(p => p !== null);
      if (probabilities.length > 0) {
        const avg = probabilities.reduce((a, b) => a + b, 0) / probabilities.length;
        const min = Math.min(...probabilities);
        const max = Math.max(...probabilities);
        console.log(`   Probability range: ${min.toFixed(2)} - ${max.toFixed(2)} (avg: ${avg.toFixed(2)})`);
      }
    }
  }
  
  // Summary recommendations
  console.log('\n\n🎯 Summary & Recommendations\n');
  console.log('=' .repeat(80));
  
  console.log('\n✅ USEFUL DATA:');
  console.log('   1. ices_rectangles - Good for:');
  console.log('      • Biogeo zones (if populated) - for Phase 1 regional gates');
  console.log('      • Depth data - for Phase 2 depth scoring');
  console.log('      • Substrate data - for Phase 2 habitat scoring');
  console.log('      • Distance to shore - for recreational accessibility');
  
  console.log('\n   2. species_bio_bands - Good for:');
  console.log('      • Existing environmental preference data');
  console.log('      • May already have temp/salinity/depth bands defined');
  console.log('      • Should check if populated before re-researching');
  
  console.log('\n❌ PROBLEMATIC DATA:');
  console.log('   1. species_monthly_abundance (DATRAS) - Issues:');
  console.log('      • All rectangles show identical species (no regional filtering)');
  console.log('      • 14-43% regional accuracy (already documented)');
  console.log('      • Recommendation: DO NOT USE for predictions');
  
  console.log('\n   2. species_frequency - Unknown quality:');
  console.log('      • Need to audit if based on DATRAS (same issues)');
  console.log('      • If modeled separately, might be useful');
  console.log('      • Recommendation: AUDIT before using');
  
  console.log('\n\n🔬 ACTION ITEMS:\n');
  console.log('   [ ] Check if species_bio_bands is already populated');
  console.log('   [ ] Audit species_frequency data source and quality');
  console.log('   [ ] Verify ices_rectangles has depth/substrate/biogeo_zone data');
  console.log('   [ ] Consider if ices_rectangles depth data can supplement Phase 2 scoring');
  console.log('   [ ] Ignore species_monthly_abundance (DATRAS) - already confirmed unusable\n');
}

checkICESData()
  .then(() => {
    console.log('✅ ICES data check complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
