/**
 * Check temp_opt_c data availability before implementing species-specific temperature scoring
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTempData() {
  console.log('🌡️  Checking temp_opt_c Data Availability\n');
  console.log('='.repeat(70) + '\n');

  // Check how many species have temp_opt_c data
  const { data: allSpecies, error: allError } = await supabase
    .from('species')
    .select('species_code, name_en, temp_opt_c')
    .order('name_en');

  if (allError) {
    console.error('❌ Error querying species:', allError);
    return;
  }

  const withTempData = allSpecies.filter(s => s.temp_opt_c && Array.isArray(s.temp_opt_c) && s.temp_opt_c.length === 2);
  const withoutTempData = allSpecies.filter(s => !s.temp_opt_c || !Array.isArray(s.temp_opt_c) || s.temp_opt_c.length !== 2);

  console.log(`Total species: ${allSpecies.length}`);
  console.log(`With temp_opt_c data: ${withTempData.length} (${Math.round(withTempData.length / allSpecies.length * 100)}%)`);
  console.log(`Without temp_opt_c data: ${withoutTempData.length}\n`);

  console.log('Sample species WITH temp_opt_c:');
  console.log('-'.repeat(70));
  withTempData.slice(0, 10).forEach(s => {
    const [min, max] = s.temp_opt_c;
    console.log(`  ${s.name_en.padEnd(30)} ${s.species_code.padEnd(12)} [${min}°C - ${max}°C]`);
  });

  console.log('\n\nSample species WITHOUT temp_opt_c:');
  console.log('-'.repeat(70));
  withoutTempData.slice(0, 10).forEach(s => {
    console.log(`  ${s.name_en.padEnd(30)} ${s.species_code.padEnd(12)} [NO DATA]`);
  });

  // Test current vs optimal temperature scoring
  console.log('\n\nTest Temperature Scoring Scenarios:');
  console.log('-'.repeat(70));
  
  const testTemperatures = [8, 12, 16, 20, 24];
  const testSpecies = withTempData.slice(0, 5);

  testTemperatures.forEach(temp => {
    console.log(`\nWater Temperature: ${temp}°C`);
    testSpecies.forEach(s => {
      const [min, max] = s.temp_opt_c;
      
      // Current generic scoring
      const currentScore = 
        (temp >= 8 && temp <= 18) ? 20 :
        (temp >= 5 && temp <= 22) ? 15 : 10;
      
      // Enhanced species-specific scoring
      const enhancedScore = 
        (temp >= min && temp <= max) ? 25 :
        (temp >= min - 2 && temp <= max + 2) ? 20 :
        (temp >= min - 5 && temp <= max + 5) ? 12 : 5;
      
      const diff = enhancedScore - currentScore;
      const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '±0';
      
      console.log(`  ${s.name_en.padEnd(25)} [${min}-${max}°C] Current: ${currentScore}/25  Enhanced: ${enhancedScore}/25  (${diffStr})`);
    });
  });

  console.log('\n' + '='.repeat(70));
  console.log('✅ Data check complete!\n');
}

checkTempData().catch(console.error);
