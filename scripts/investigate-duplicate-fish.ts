import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateDuplicates() {
  console.log('🔍 INVESTIGATING DUPLICATE FISH ISSUES\n');
  console.log('='.repeat(80) + '\n');

  // ISSUE 1: Saithe/Pollock
  console.log('ISSUE 1: Saithe/Pollock Entries\n');
  console.log('─'.repeat(80));
  
  const { data: saithePollock } = await supabase
    .from('species')
    .select('*')
    .or('species_code.eq.pol,species_code.eq.pok,species_code.eq.sai')
    .order('scientific_name');

  if (saithePollock) {
    for (const sp of saithePollock) {
      console.log(`\n${sp.species_code.toUpperCase()}: "${sp.name_en}"`);
      console.log(`  Scientific: ${sp.scientific_name}`);
      console.log(`  Temp range: ${sp.temp_pref_min}°C - ${sp.temp_pref_max}°C`);
      console.log(`  Valid scientific name: ${/^[A-Z][a-z]+ [a-z]+$/.test(sp.scientific_name) ? '✅' : '❌'}`);
    }
  }

  console.log('\n\n🔍 Analysis:');
  console.log('  - Pollachius pollachius = Pollack ✅');
  console.log('  - Pollachius virens = Saithe (also called Coalfish, Coley) ✅');
  console.log('  - "Saithe/Pollock" is NOT a scientific name ❌');
  console.log('  - Recommendation: DELETE species_code "sai" as duplicate');

  // ISSUE 2: Gilthead Seabream
  console.log('\n\n' + '='.repeat(80));
  console.log('\nISSUE 2: Gilthead Seabream Entries\n');
  console.log('─'.repeat(80));
  
  const { data: seabream } = await supabase
    .from('species')
    .select('*')
    .or('species_code.eq.sbg,species_code.eq.sba')
    .order('scientific_name');

  if (seabream) {
    for (const sp of seabream) {
      console.log(`\n${sp.species_code.toUpperCase()}: "${sp.name_en}"`);
      console.log(`  Scientific: ${sp.scientific_name}`);
      console.log(`  Temp range: ${sp.temp_pref_min}°C - ${sp.temp_pref_max}°C`);
      console.log(`  Valid scientific name: ${/^[A-Z][a-z]+ [a-z]+$/.test(sp.scientific_name) ? '✅' : '❌'}`);
    }
  }

  console.log('\n\n🔍 Analysis:');
  console.log('  - Sparus aurata = Gilthead Seabream (Mediterranean/Atlantic) ✅');
  console.log('  - "Gilthead Seabream" is NOT a scientific name ❌');
  console.log('  - SBA appears to be the correct entry');
  console.log('  - Recommendation: CHECK if SBG has data, then DELETE or FIX');

  // Check for associated data
  console.log('\n\nChecking for associated data for SBG:');
  
  const { data: sbgSubstrates } = await supabase
    .from('species_substrates')
    .select('substrate_type')
    .eq('species_code', 'sbg');
  
  const { data: sbgDepths } = await supabase
    .from('species_depths')
    .select('depth_zone')
    .eq('species_code', 'sbg');
  
  const { data: sbgBait } = await supabase
    .from('species_bait')
    .select('bait_type')
    .eq('species_code', 'sbg');

  console.log(`  - Substrates: ${sbgSubstrates?.length || 0}`);
  console.log(`  - Depths: ${sbgDepths?.length || 0}`);
  console.log(`  - Bait: ${sbgBait?.length || 0}`);

  // Check aliases
  const { data: aliases } = await supabase
    .from('species_name_alias')
    .select('*')
    .in('scientific_name', ['Sparus aurata', 'Gilthead Seabream']);

  console.log(`\n  Aliases found: ${aliases?.length || 0}`);
  if (aliases) {
    for (const alias of aliases) {
      console.log(`    - "${alias.name_en_alias}" → ${alias.scientific_name}`);
    }
  }

  // ISSUE 3: All invalid scientific names
  console.log('\n\n' + '='.repeat(80));
  console.log('\nISSUE 3: All Species with Invalid Scientific Names\n');
  console.log('─'.repeat(80));
  
  const { data: allSpecies } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name')
    .order('scientific_name');

  const invalid = allSpecies?.filter(sp => {
    const sci = sp.scientific_name;
    // Valid scientific name should be:
    // - Two words (binomial)
    // - Start with capital letter
    // - Second word lowercase
    // - No parentheses, no special chars (except maybe subspecies)
    const isValid = /^[A-Z][a-z]+ [a-z]+/.test(sci);
    return !isValid;
  });

  if (invalid && invalid.length > 0) {
    console.log(`\n❌ Found ${invalid.length} species with invalid scientific names:\n`);
    for (const sp of invalid) {
      console.log(`  ${sp.species_code.padEnd(15)} | ${sp.name_en.padEnd(35)} | "${sp.scientific_name}"`);
    }
  } else {
    console.log('\n✅ All other species have valid scientific names');
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('\nSUMMARY & RECOMMENDATIONS\n');
  console.log('─'.repeat(80));
  console.log('\n1. DELETE species_code "sai" (Saithe/Pollock)');
  console.log('   - Duplicate of "pok" (Pollachius virens)');
  console.log('   - Has invalid scientific name');
  console.log('   - Command: DELETE FROM species WHERE species_code = \'sai\';');
  
  console.log('\n2. FIX species_code "sbg" (Gilthead Seabream)');
  if (sbgSubstrates?.length || sbgDepths?.length || sbgBait?.length) {
    console.log('   - Has associated data - needs migration to "sba"');
    console.log('   - Migrate substrates, depths, bait to "sba"');
    console.log('   - Then delete "sbg"');
  } else {
    console.log('   - No associated data');
    console.log('   - Safe to DELETE');
    console.log('   - Command: DELETE FROM species WHERE species_code = \'sbg\';');
  }
  
  if (invalid && invalid.length > 2) {
    console.log(`\n3. FIX ${invalid.length - 2} other species with invalid scientific names`);
    console.log('   - Review each manually');
    console.log('   - Update with correct binomial nomenclature');
  }
}

investigateDuplicates().then(() => {
  console.log('\n✅ Investigation complete\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
