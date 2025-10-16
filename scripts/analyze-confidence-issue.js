#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function analyzeConfidence() {
  // Test multiple rectangles to see if they all return 85%
  const rectangles = ['31F1', '37I0', '28E5', '20C5', '21D8'];
  
  console.log('🔍 Analyzing confidence across rectangles...\n');
  
  for (const rect of rectangles) {
    const { data, error } = await supabase.rpc('get_environmental_predictions_basic', {
      target_rectangle: rect,
      target_date: '2025-10-16'
    });
    
    if (error) {
      console.log(`❌ ${rect}: Error - ${error.message}`);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.log(`❌ ${rect}: No data`);
      continue;
    }
    
    const confidences = data.map(p => p.confidence);
    const unique = [...new Set(confidences)];
    const hasBioData = data.filter(p => p.has_bio_data).length;
    
    console.log(`📍 ${rect}:`);
    console.log(`   Species: ${data.length}`);
    console.log(`   Confidence values: ${unique.join(', ')}`);
    console.log(`   Has bio data: ${hasBioData}/${data.length}`);
    console.log(`   Sample: ${data[0].species_name} = ${data[0].confidence}%`);
    console.log('');
  }
  
  // Now check what environmental data exists for one rectangle
  console.log('\n🌊 Environmental data for 31F1:');
  const { data: envData } = await supabase
    .from('findr_conditions_snapshots')
    .select('*')
    .eq('rectangle_code', '31F1')
    .eq('captured_for', '2025-10-16')
    .single();
    
  if (envData) {
    console.log('   Chlorophyll:', envData.water_chl_ug_l ? 'YES' : 'NO');
    console.log('   Oxygen:', envData.water_o2_ml_l ? 'YES' : 'NO');
    console.log('   Temperature:', envData.water_temp_c ? 'YES' : 'NO');
    console.log('   Clarity (kd490):', envData.water_clarity_kd490 ? 'YES' : 'NO');
    console.log('   Salinity:', envData.water_salinity_psu ? 'YES' : 'NO');
    
    // Count data points
    let dataPoints = 0;
    if (envData.water_chl_ug_l) dataPoints++;
    if (envData.water_o2_ml_l) dataPoints++;
    if (envData.water_temp_c) dataPoints++;
    if (envData.water_clarity_kd490) dataPoints++;
    if (envData.water_salinity_psu) dataPoints++;
    
    console.log(`\n   📊 Data coverage: ${dataPoints}/5 variables`);
    console.log(`   💡 Expected confidence: ~${dataPoints * 20}%`);
  } else {
    console.log('   ❌ No environmental data found');
  }
}

analyzeConfidence();
