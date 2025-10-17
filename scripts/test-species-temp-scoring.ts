/**
 * Test species-specific temperature scoring enhancement
 * 
 * Demonstrates how cold-water and warm-water species now score differently
 * based on their optimal temperature ranges (temp_opt_c)
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

interface PredictionResult {
  species_id: string;
  species_code: string;
  name_en: string;
  confidence: number;
  temp_score: number;
  light_score: number;
}

async function testTempScoring() {
  console.log('🌡️  Testing Species-Specific Temperature Scoring\n');
  console.log('='.repeat(70) + '\n');

  // Get some species with known temp preferences
  const { data: speciesData, error: speciesError } = await supabase
    .from('species')
    .select('species_code, name_en, temp_opt_c')
    .in('species_code', ['cod', 'wrb', 'bss', 'bluefish', 'bonito'])
    .order('temp_opt_c');

  if (speciesError || !speciesData) {
    console.error('❌ Error fetching species:', speciesError);
    return;
  }

  console.log('Test Species with Temperature Preferences:');
  console.log('-'.repeat(70));
  speciesData.forEach(s => {
    const [min, max] = s.temp_opt_c as number[];
    console.log(`  ${s.name_en.padEnd(25)} [${min}°C - ${max}°C]`);
  });
  console.log('\n');

  // Test predictions at different temperatures
  const testRectangle = '31F2';
  const testDate = '2025-10-17';

  console.log('Testing Predictions (Basic RPC):');
  console.log('-'.repeat(70));

  const { data: predictions, error: predError } = await supabase.rpc(
    'get_environmental_predictions_basic',
    {
      target_rectangle: testRectangle,
      target_date: testDate
    }
  );

  if (predError) {
    console.error('❌ RPC error:', predError);
    return;
  }

  if (!predictions || !Array.isArray(predictions)) {
    console.error('❌ No predictions returned');
    return;
  }

  const testSpeciesCodes = ['cod', 'wrb', 'bss', 'bluefish', 'bonito'];
  const filteredPreds = (predictions as PredictionResult[])
    .filter(p => testSpeciesCodes.includes(p.species_code))
    .sort((a, b) => b.temp_score - a.temp_score);

  console.log('\nTest Results (sorted by temp_score):');
  console.log('-'.repeat(70));
  
  filteredPreds.forEach(pred => {
    const species = speciesData.find(s => s.species_code === pred.species_code);
    const [min, max] = (species?.temp_opt_c as number[]) || [0, 0];
    
    console.log(`\n${pred.name_en} (${pred.species_code})`);
    console.log(`  Optimal Range: ${min}°C - ${max}°C`);
    console.log(`  Temp Score: ${pred.temp_score}/25 🌡️`);
    console.log(`  Light Score: ${pred.light_score}/15 🌅`);
    console.log(`  Total Confidence: ${pred.confidence}/100`);
  });

  // Enhanced test with GPS
  console.log('\n\nTesting Enhanced Predictions (with GPS):');
  console.log('-'.repeat(70));

  const { data: enhancedPreds, error: enhancedError } = await supabase.rpc(
    'get_environmental_predictions_enhanced',
    {
      target_rectangle: testRectangle,
      target_date: testDate,
      user_lat: 50.7,
      user_lon: -1.3,
      user_substrate: 'rock',
      user_depth_m: 15
    }
  );

  if (enhancedError) {
    console.error('❌ Enhanced RPC error:', enhancedError);
    return;
  }

  const filteredEnhanced = (enhancedPreds as PredictionResult[])
    .filter(p => testSpeciesCodes.includes(p.species_code))
    .sort((a, b) => b.confidence - a.confidence);

  console.log('\nEnhanced Results (sorted by confidence):');
  console.log('-'.repeat(70));

  filteredEnhanced.forEach(pred => {
    const species = speciesData.find(s => s.species_code === pred.species_code);
    const [min, max] = (species?.temp_opt_c as number[]) || [0, 0];
    
    console.log(`\n${pred.name_en} (${pred.species_code})`);
    console.log(`  Optimal Range: ${min}°C - ${max}°C`);
    console.log(`  Temp Score: ${pred.temp_score}/25 🌡️`);
    console.log(`  Total Confidence: ${pred.confidence}/100`);
  });

  // Demonstrate temperature impact
  console.log('\n\nTemperature Impact Analysis:');
  console.log('-'.repeat(70));
  console.log('\nHow scoring varies by water temperature for key species:\n');

  const demoTemps = [8, 12, 16, 20, 24];
  const demoSpecies = speciesData.slice(0, 3);

  console.log('Temp  ' + demoSpecies.map(s => s.name_en.padEnd(20)).join(''));
  console.log('-'.repeat(70));

  demoTemps.forEach(temp => {
    const scores = demoSpecies.map(s => {
      const [min, max] = s.temp_opt_c as number[];
      
      const score = 
        (temp >= min && temp <= max) ? 25 :
        (temp >= min - 2 && temp <= max + 2) ? 20 :
        (temp >= min - 5 && temp <= max + 5) ? 12 : 5;
      
      return String(score).padStart(2) + '/25';
    });
    
    console.log(`${temp}°C   ` + scores.map(s => s.padEnd(20)).join(''));
  });

  console.log('\n' + '='.repeat(70));
  console.log('✅ Species-specific temperature scoring test complete!');
  console.log('='.repeat(70) + '\n');
}

testTempScoring().catch(console.error);
