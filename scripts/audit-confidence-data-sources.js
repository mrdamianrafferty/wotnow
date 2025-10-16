#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function auditDataSources() {
  console.log('🔍 AUDITING DATA SOURCES FOR CONFIDENCE SCORING\n');
  console.log('='.repeat(70));
  
  // 1. Species Bio Bands
  console.log('\n📊 1. SPECIES BIO BANDS (Chemical tolerance ranges)');
  const { data: bioBands, error: bioBandsError } = await supabase
    .from('species_bio_bands')
    .select('*')
    .limit(5);
  
  if (bioBands && bioBands.length > 0) {
    console.log(`   ✅ Found ${bioBands.length} sample records`);
    console.log(`   Fields:`, Object.keys(bioBands[0]).join(', '));
    console.log(`   Sample:`, JSON.stringify(bioBands[0], null, 2));
  } else {
    console.log(`   ❌ No data or error:`, bioBandsError?.message);
  }
  
  // Count total
  const { count: bioBandsCount } = await supabase
    .from('species_bio_bands')
    .select('*', { count: 'exact', head: true });
  console.log(`   📈 Total records: ${bioBandsCount || 0}`);
  
  // 2. Bio Bands Thresholds
  console.log('\n📊 2. BIO BANDS THRESHOLDS (Classification lookup)');
  const { data: thresholds } = await supabase
    .from('bio_bands_thresholds')
    .select('*')
    .limit(5);
    
  if (thresholds && thresholds.length > 0) {
    console.log(`   ✅ Found ${thresholds.length} sample records`);
    console.log(`   Parameters:`, [...new Set(thresholds.map(t => t.parameter))].join(', '));
  } else {
    console.log(`   ❌ No threshold data`);
  }
  
  const { count: thresholdCount } = await supabase
    .from('bio_bands_thresholds')
    .select('*', { count: 'exact', head: true });
  console.log(`   📈 Total thresholds: ${thresholdCount || 0}`);
  
  // 3. Environmental Preferences
  console.log('\n🌡️ 3. ENVIRONMENTAL PREFERENCES (Temperature, depth, etc)');
  const { data: envPrefs } = await supabase
    .from('environmental_preferences')
    .select('*')
    .limit(5);
    
  if (envPrefs && envPrefs.length > 0) {
    console.log(`   ✅ Found ${envPrefs.length} sample records`);
    console.log(`   Fields:`, Object.keys(envPrefs[0]).join(', '));
    console.log(`   Sample temp range:`, {
      species_id: envPrefs[0].species_id,
      temp_min: envPrefs[0].temp_min_c,
      temp_optimal_min: envPrefs[0].temp_optimal_min_c,
      temp_optimal_max: envPrefs[0].temp_optimal_max_c,
      temp_max: envPrefs[0].temp_max_c
    });
  } else {
    console.log(`   ❌ No environmental preferences`);
  }
  
  const { count: envPrefCount } = await supabase
    .from('environmental_preferences')
    .select('*', { count: 'exact', head: true });
  console.log(`   📈 Total records: ${envPrefCount || 0}`);
  
  // 4. Species Substrates
  console.log('\n🪨 4. SPECIES SUBSTRATES (Habitat preferences)');
  const { data: substrates } = await supabase
    .from('species_substrates')
    .select('*')
    .limit(5);
    
  if (substrates && substrates.length > 0) {
    console.log(`   ✅ Found ${substrates.length} sample records`);
    console.log(`   Sample:`, {
      name_en: substrates[0].name_en,
      has_sand: substrates[0].has_sand,
      has_rock: substrates[0].has_rock,
      has_mud: substrates[0].has_mud,
      has_gravel: substrates[0].has_gravel,
      has_mixed: substrates[0].has_mixed
    });
  } else {
    console.log(`   ❌ No substrate data`);
  }
  
  const { count: substrateCount } = await supabase
    .from('species_substrates')
    .select('*', { count: 'exact', head: true });
  console.log(`   📈 Total records: ${substrateCount || 0}`);
  
  // 5. Current Environmental Data Coverage
  console.log('\n🌊 5. COPERNICUS DATA COVERAGE (Recent)');
  const { data: recentData } = await supabase
    .from('copernicus_data')
    .select('rectangle_code, data_date, water_temp_c, chlorophyll_mass, oxygen, salinity, water_clarity_kd490')
    .gte('data_date', '2025-10-01')
    .order('data_date', { ascending: false })
    .limit(5);
    
  if (recentData && recentData.length > 0) {
    console.log(`   ✅ Found ${recentData.length} recent records`);
    recentData.forEach(d => {
      const vars = [];
      if (d.water_temp_c) vars.push('temp');
      if (d.chlorophyll_mass) vars.push('chl');
      if (d.oxygen) vars.push('o2');
      if (d.salinity) vars.push('sal');
      if (d.water_clarity_kd490) vars.push('clarity');
      console.log(`   - ${d.rectangle_code} (${d.data_date}): ${vars.join(', ')}`);
    });
  } else {
    console.log(`   ❌ No recent Copernicus data`);
  }
  
  const { count: copernicusCount } = await supabase
    .from('copernicus_data')
    .select('*', { count: 'exact', head: true })
    .gte('data_date', '2025-10-01');
  console.log(`   📈 October 2025 records: ${copernicusCount || 0}`);
  
  // 6. ICES Rectangles with substrate info
  console.log('\n🗺️ 6. ICES RECTANGLES (Substrate mapping)');
  const { data: rectangles } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, has_sand, has_rock, has_mud, has_gravel, has_mixed')
    .limit(5);
    
  if (rectangles && rectangles.length > 0) {
    console.log(`   ✅ Found ${rectangles.length} sample rectangles`);
    console.log(`   Sample:`, {
      code: rectangles[0].rectangle_code,
      region: rectangles[0].region,
      substrates: [
        rectangles[0].has_sand && 'sand',
        rectangles[0].has_rock && 'rock',
        rectangles[0].has_mud && 'mud',
        rectangles[0].has_gravel && 'gravel',
        rectangles[0].has_mixed && 'mixed'
      ].filter(Boolean).join(', ')
    });
  }
  
  const { count: rectangleCount } = await supabase
    .from('ices_rectangles')
    .select('*', { count: 'exact', head: true });
  console.log(`   📈 Total rectangles: ${rectangleCount || 0}`);
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📋 SUMMARY - Data Available for Confidence Scoring:');
  console.log('='.repeat(70));
  console.log(`
✅ Species Bio Bands:           ${bioBandsCount || 0} records (chemical tolerance)
✅ Bio Bands Thresholds:        ${thresholdCount || 0} thresholds (classification)
✅ Environmental Preferences:   ${envPrefCount || 0} records (temp, depth ranges)
✅ Species Substrates:          ${substrateCount || 0} records (habitat match)
✅ Copernicus Data (Oct 2025):  ${copernicusCount || 0} records (live conditions)
✅ ICES Rectangles:             ${rectangleCount || 0} rectangles (location substrate)

🎯 CONFIDENCE SCORING COMPONENTS:
   1. Bio Band Match Score (0-25 points)
      - Match species tolerance to actual chlorophyll, O2, salinity
      - Weight: HIGH (chemical environment is critical)
   
   2. Temperature Match Score (0-25 points)
      - Compare water_temp_c to species temp_optimal range
      - Weight: HIGH (temperature directly affects activity)
   
   3. Substrate Match Score (0-20 points)
      - Overlap between location substrate and species preference
      - Weight: MEDIUM-HIGH (habitat suitability)
   
   4. Data Freshness Score (0-15 points)
      - Age of environmental data (same day = 15, 1 week = 10, etc)
      - Weight: MEDIUM (recent data = higher confidence)
   
   5. Species Data Completeness (0-15 points)
      - How many preference fields are populated for this species
      - Weight: MEDIUM (more data = better prediction)
   
   TOTAL: 0-100 confidence score
  `);
}

auditDataSources();
