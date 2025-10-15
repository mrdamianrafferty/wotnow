import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function checkBridgeTables() {
  console.log('🔍 Checking for Bridge Tables that link OLD species_ids to species_codes\n');
  console.log('='.repeat(80));
  
  // Get sample old species IDs from species_frequency
  const { data: freqSample } = await supabase
    .from('species_frequency')
    .select('species_id')
    .limit(10);
  
  const oldIds = freqSample?.map(r => r.species_id) || [];
  console.log('\n📋 Sample OLD species IDs from species_frequency:');
  oldIds.forEach((id, idx) => console.log(`  ${idx + 1}. ${id}`));
  
  // Check species_monthly_abundance
  console.log('\n\n🔍 Checking species_monthly_abundance for species_code column...');
  const { data: abundance } = await supabase
    .from('species_monthly_abundance')
    .select('*')
    .in('species_id', oldIds)
    .limit(2);
  
  if (abundance && abundance.length > 0) {
    console.log(`✅ FOUND ${abundance.length} records!`);
    console.log('\nColumns:', Object.keys(abundance[0]));
    if ('species_code' in abundance[0]) {
      console.log(`\n🎯 HAS species_code!`);
      abundance.forEach(r => console.log(`  ${r.species_id} → ${r.species_code}`));
    } else {
      console.log('❌ No species_code column');
    }
  } else {
    console.log('❌ No matching records');
  }
  
  // Check species_datras_quarterly_support
  console.log('\n\n🔍 Checking species_datras_quarterly_support...');
  const { data: datras } = await supabase
    .from('species_datras_quarterly_support')
    .select('*')
    .in('species_id', oldIds)
    .limit(2);
  
  if (datras && datras.length > 0) {
    console.log(`✅ FOUND ${datras.length} records!`);
    console.log('\nColumns:', Object.keys(datras[0]));
    if ('species_code' in datras[0]) {
      console.log(`\n🎯 HAS species_code!`);
      datras.forEach(r => console.log(`  ${r.species_id} → ${r.species_code}`));
    } else {
      console.log('❌ No species_code column');
    }
  } else {
    console.log('❌ No matching records');
  }
  
  // Final verdict
  console.log('\n\n' + '='.repeat(80));
  console.log('🎯 VERDICT:\n');
  
  const hasMonthlyAbundanceBridge = abundance && abundance.length > 0 && 'species_code' in abundance[0];
  const hasDatrasBridge = datras && datras.length > 0 && 'species_code' in datras[0];
  
  if (hasMonthlyAbundanceBridge || hasDatrasBridge) {
    console.log('✅ We found a BRIDGE TABLE with both old species_ids AND species_codes!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Extract mapping: old_species_id → species_code');
    console.log('   2. Join with current species table: species_code → new_species_id');
    console.log('   3. Update species_frequency: SET species_id = new_id WHERE species_id = old_id');
    console.log('   4. Use species_frequency data for predictions! 🎉');
  } else {
    console.log('❌ No bridge table found.');
    console.log('\n📝 Remaining Options:');
    console.log('   1. Add species_code column to species_frequency (manual mapping required)');
    console.log('   2. Abandon species_frequency, research all 62 species manually');
    console.log('   3. Re-import species_frequency with correct IDs from source');
  }
}

checkBridgeTables().then(() => process.exit(0)).catch(console.error);
