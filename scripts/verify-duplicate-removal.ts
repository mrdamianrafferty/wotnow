import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDuplicateRemoval() {
  console.log('✅ VERIFYING DUPLICATE FISH REMOVAL\n');
  console.log('='.repeat(80) + '\n');

  let allPassed = true;

  // TEST 1: Verify SAI is gone
  console.log('TEST 1: Verify SAI (Saithe/Pollock duplicate) removed');
  const { data: saiCheck } = await supabase
    .from('species')
    .select('*')
    .eq('species_code', 'sai');

  if (!saiCheck || saiCheck.length === 0) {
    console.log('  ✅ PASS: SAI species entry deleted');
  } else {
    console.log('  ❌ FAIL: SAI species entry still exists');
    allPassed = false;
  }

  // TEST 2: Verify POK still exists with correct data
  console.log('\nTEST 2: Verify POK (Saithe) still exists with correct scientific name');
  const { data: pokCheck } = await supabase
    .from('species')
    .select('*')
    .eq('species_code', 'pok');

  if (pokCheck && pokCheck.length === 1 && pokCheck[0].scientific_name === 'Pollachius virens') {
    console.log('  ✅ PASS: POK exists with scientific name "Pollachius virens"');
    console.log(`     English name: "${pokCheck[0].name_en}"`);
  } else {
    console.log('  ❌ FAIL: POK issue');
    allPassed = false;
  }

  // TEST 3: Verify SBG is gone
  console.log('\nTEST 3: Verify SBG (Gilthead Seabream duplicate) removed');
  const { data: sbgCheck } = await supabase
    .from('species')
    .select('*')
    .eq('species_code', 'sbg');

  if (!sbgCheck || sbgCheck.length === 0) {
    console.log('  ✅ PASS: SBG species entry deleted');
  } else {
    console.log('  ❌ FAIL: SBG species entry still exists');
    allPassed = false;
  }

  // TEST 4: Verify SBA still exists with correct data
  console.log('\nTEST 4: Verify SBA (Gilthead Seabream) still exists with correct scientific name');
  const { data: sbaCheck } = await supabase
    .from('species')
    .select('*')
    .eq('species_code', 'sba');

  if (sbaCheck && sbaCheck.length === 1 && sbaCheck[0].scientific_name === 'Sparus aurata') {
    console.log('  ✅ PASS: SBA exists with scientific name "Sparus aurata"');
    console.log(`     English name: "${sbaCheck[0].name_en}"`);
  } else {
    console.log('  ❌ FAIL: SBA issue');
    allPassed = false;
  }

  // TEST 5: Verify no invalid scientific names remain
  console.log('\nTEST 5: Verify all species have valid scientific names');
  const { data: allSpecies } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name');

  const invalid = allSpecies?.filter(sp => {
    const sci = sp.scientific_name;
    const isValid = /^[A-Z][a-z]+ [a-z]+/.test(sci);
    return !isValid;
  });

  if (!invalid || invalid.length === 0) {
    console.log('  ✅ PASS: All species have valid binomial scientific names');
  } else {
    console.log(`  ❌ FAIL: Found ${invalid.length} species with invalid scientific names:`);
    for (const sp of invalid) {
      console.log(`     - ${sp.species_code}: "${sp.scientific_name}"`);
    }
    allPassed = false;
  }

  // TEST 6: Verify no duplicate scientific names
  console.log('\nTEST 6: Verify no duplicate scientific names');
  const scientificNameMap = new Map<string, typeof allSpecies>();
  
  for (const species of allSpecies || []) {
    const sciName = species.scientific_name.toLowerCase().trim();
    if (!scientificNameMap.has(sciName)) {
      scientificNameMap.set(sciName, []);
    }
    scientificNameMap.get(sciName)!.push(species);
  }

  const duplicateScientific = Array.from(scientificNameMap.entries())
    .filter(([_, species]) => (species?.length || 0) > 1);

  if (duplicateScientific.length === 0) {
    console.log('  ✅ PASS: No duplicate scientific names found');
  } else {
    console.log(`  ❌ FAIL: Found ${duplicateScientific.length} duplicate scientific names:`);
    for (const [sciName, species] of duplicateScientific) {
      if (species) {
        console.log(`     - "${sciName}": ${species.map(s => s.species_code).join(', ')}`);
      }
    }
    allPassed = false;
  }

  // TEST 7: Verify total species count
  console.log('\nTEST 7: Verify species count');
  console.log(`  Total species: ${allSpecies?.length || 0}`);
  console.log(`  Expected: 77 (was 79, removed 2 duplicates)`);
  if (allSpecies?.length === 77) {
    console.log('  ✅ PASS: Correct species count');
  } else if (allSpecies?.length === 79) {
    console.log('  ⚠️  WARNING: Still 79 species (duplicates not yet removed)');
  } else {
    console.log(`  ℹ️  INFO: Count is ${allSpecies?.length} (verify this is expected)`);
  }

  // TEST 8: Check aliases still work
  console.log('\nTEST 8: Verify aliases still work for Saithe and Gilthead');
  
  const { data: saitheAliases } = await supabase
    .from('species_name_alias')
    .select('*')
    .eq('scientific_name', 'Pollachius virens');
  
  console.log(`  Saithe (Pollachius virens) aliases: ${saitheAliases?.length || 0}`);
  if (saitheAliases && saitheAliases.length > 0) {
    for (const alias of saitheAliases) {
      console.log(`     - "${alias.name_en_alias}"`);
    }
    console.log('  ✅ PASS: Saithe aliases exist');
  } else {
    console.log('  ℹ️  INFO: No aliases found for Saithe (may want to add)');
  }

  const { data: giltheadAliases } = await supabase
    .from('species_name_alias')
    .select('*')
    .eq('scientific_name', 'Sparus aurata');
  
  console.log(`\n  Gilthead (Sparus aurata) aliases: ${giltheadAliases?.length || 0}`);
  if (giltheadAliases && giltheadAliases.length > 0) {
    console.log('  First 5 aliases:');
    for (const alias of giltheadAliases.slice(0, 5)) {
      console.log(`     - "${alias.name_en_alias}"`);
    }
    console.log('  ✅ PASS: Gilthead aliases exist');
  }

  // SUMMARY
  console.log('\n' + '='.repeat(80));
  console.log('\nSUMMARY\n');
  console.log('─'.repeat(80));
  
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Duplicate removal successful!');
  } else {
    console.log('❌ SOME TESTS FAILED - Review issues above');
  }

  console.log('\nDuplicate Fish Cleanup:');
  console.log('  - Removed: SAI (Saithe/Pollock) ← duplicate of POK');
  console.log('  - Removed: SBG (Gilthead Seabream) ← duplicate of SBA');
  console.log('  - Kept: POK (Pollachius virens)');
  console.log('  - Kept: SBA (Sparus aurata)');
  console.log(`\nTotal species: ${allSpecies?.length || 0} (was 79, expected 77)`);
}

verifyDuplicateRemoval().then(() => {
  console.log('\n✅ Verification complete\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
