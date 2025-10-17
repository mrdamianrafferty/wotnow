/**
 * Check context_bias data availability before implementing habitat context bonuses
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

async function checkContextBiasData() {
  console.log('🏝️  Checking context_bias Data Availability\n');
  console.log('='.repeat(70) + '\n');

  // Get all species with context_bias data
  const { data: allSpecies, error: allError } = await supabase
    .from('species')
    .select('species_code, name_en, context_bias')
    .order('name_en');

  if (allError || !allSpecies) {
    console.error('❌ Error querying species:', allError);
    return;
  }

  const withContextBias = allSpecies.filter(s => 
    s.context_bias && 
    typeof s.context_bias === 'object' && 
    Object.keys(s.context_bias).length > 0
  );
  
  const withoutContextBias = allSpecies.filter(s => 
    !s.context_bias || 
    typeof s.context_bias !== 'object' || 
    Object.keys(s.context_bias).length === 0
  );

  console.log(`Total species: ${allSpecies.length}`);
  console.log(`With context_bias data: ${withContextBias.length} (${Math.round(withContextBias.length / allSpecies.length * 100)}%)`);
  console.log(`Without context_bias data: ${withoutContextBias.length}\n`);

  console.log('Species WITH context_bias:');
  console.log('-'.repeat(70));
  withContextBias.forEach(s => {
    const biases = s.context_bias as Record<string, number>;
    const biasStr = Object.entries(biases)
      .map(([habitat, bonus]) => `${habitat}:+${(bonus * 100).toFixed(0)}%`)
      .join(', ');
    console.log(`  ${s.name_en.padEnd(30)} ${s.species_code.padEnd(12)} ${biasStr}`);
  });

  // Analyze habitat types
  console.log('\n\nHabitat Types Found:');
  console.log('-'.repeat(70));
  
  const habitatCounts: Record<string, number> = {};
  withContextBias.forEach(s => {
    const biases = s.context_bias as Record<string, number>;
    Object.keys(biases).forEach(habitat => {
      habitatCounts[habitat] = (habitatCounts[habitat] || 0) + 1;
    });
  });

  Object.entries(habitatCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([habitat, count]) => {
      console.log(`  ${habitat.padEnd(30)} ${count} species`);
    });

  // Show example bonus calculations
  console.log('\n\nExample Bonus Calculations:');
  console.log('-'.repeat(70));
  
  const exampleSpecies = withContextBias.slice(0, 5);
  const baseConfidence = 85;

  exampleSpecies.forEach(s => {
    const biases = s.context_bias as Record<string, number>;
    console.log(`\n${s.name_en} (${s.species_code})`);
    console.log(`  Base confidence: ${baseConfidence}/100`);
    
    Object.entries(biases).forEach(([habitat, multiplier]) => {
      const enhanced = Math.min(100, Math.round(baseConfidence * (1 + multiplier)));
      const bonus = enhanced - baseConfidence;
      console.log(`    In ${habitat}: ${enhanced}/100 (+${bonus} points, +${(multiplier * 100).toFixed(0)}% multiplier)`);
    });
  });

  console.log('\n' + '='.repeat(70));
  console.log('✅ Data check complete!\n');
}

checkContextBiasData().catch(console.error);
