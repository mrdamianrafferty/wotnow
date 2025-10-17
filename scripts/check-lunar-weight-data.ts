/**
 * Check lunar_weight data coverage across species
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

async function checkLunarWeightData() {
  console.log('🌙 Checking lunar_weight data coverage\n');

  const { data, error } = await supabase
    .from('species')
    .select('species_code, name_en, lunar_weight, diurnal_sensitivity')
    .order('lunar_weight', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  const withWeight = data.filter(s => s.lunar_weight !== null);
  const withoutWeight = data.filter(s => s.lunar_weight === null);

  console.log(`Total species: ${data.length}`);
  console.log(`With lunar_weight: ${withWeight.length} (${Math.round(withWeight.length / data.length * 100)}%)`);
  console.log(`Without lunar_weight: ${withoutWeight.length} (${Math.round(withoutWeight.length / data.length * 100)}%)\n`);

  console.log('Species WITH lunar_weight (sorted by weight):');
  console.log('─'.repeat(80));
  withWeight.forEach(s => {
    const weight = s.lunar_weight?.toFixed(2) || 'N/A';
    const diurnal = s.diurnal_sensitivity || 'N/A';
    console.log(`${s.name_en.padEnd(30)} (${s.species_code.padEnd(6)}) Weight: ${weight.padStart(4)} Diurnal: ${diurnal}`);
  });

  if (withoutWeight.length > 0) {
    console.log('\n\nSpecies WITHOUT lunar_weight:');
    console.log('─'.repeat(80));
    withoutWeight.slice(0, 20).forEach(s => {
      const diurnal = s.diurnal_sensitivity || 'N/A';
      console.log(`${s.name_en.padEnd(30)} (${s.species_code.padEnd(6)}) Diurnal: ${diurnal}`);
    });
    if (withoutWeight.length > 20) {
      console.log(`... and ${withoutWeight.length - 20} more`);
    }
  }

  // Analyze correlation with diurnal_sensitivity
  console.log('\n\nCorrelation Analysis:');
  console.log('─'.repeat(80));
  const strongDiurnal = data.filter(s => s.diurnal_sensitivity === 'strong');
  const strongDiurnalWithLunar = strongDiurnal.filter(s => s.lunar_weight !== null);
  
  console.log(`Strong diurnal species: ${strongDiurnal.length}`);
  console.log(`  └─ With lunar_weight: ${strongDiurnalWithLunar.length} (${strongDiurnal.length > 0 ? Math.round(strongDiurnalWithLunar.length / strongDiurnal.length * 100) : 0}%)`);

  const weakDiurnal = data.filter(s => s.diurnal_sensitivity === 'weak' || s.diurnal_sensitivity === null);
  const weakDiurnalWithLunar = weakDiurnal.filter(s => s.lunar_weight !== null);
  
  console.log(`\nWeak/null diurnal species: ${weakDiurnal.length}`);
  console.log(`  └─ With lunar_weight: ${weakDiurnalWithLunar.length} (${weakDiurnal.length > 0 ? Math.round(weakDiurnalWithLunar.length / weakDiurnal.length * 100) : 0}%)`);
}

checkLunarWeightData().catch(console.error);
