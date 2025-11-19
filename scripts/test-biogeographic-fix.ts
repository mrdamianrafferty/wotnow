import { createClient } from '@supabase/supabase-js';

async function testFix() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('=== Testing Biogeographic Region Fix ===\n');

  // Clear cache first
  console.log('Clearing cache for 28E5...');
  await supabase
    .from('findr_prediction_sessions')
    .delete()
    .eq('rectangle_code', '28E5');

  console.log('✅ Cache cleared\n');

  // Test 28E5 (Asturias, IBI region → should map to NE_Atlantic)
  console.log('Testing rectangle 28E5 (Asturias, IBI region)...');
  const { data, error } = await supabase
    .rpc('get_fishing_confidence_v3', {
      target_rectangle: '28E5',
      target_date: '2025-11-18',
      target_month: 11
    });

  if (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }

  console.log(`\nTotal species returned: ${data?.length || 0}`);

  // Check for Pacific species (should be NONE)
  const pacificSpecies = data?.filter(s =>
    s.species_name?.toLowerCase().includes('pacific')
  ) || [];

  // Check for Atlantic species
  const atlanticSpecies = data?.filter(s =>
    !s.species_name?.toLowerCase().includes('pacific')
  ) || [];

  console.log(`Pacific species: ${pacificSpecies.length} ${pacificSpecies.length === 0 ? '✅' : '❌'}`);
  console.log(`Atlantic/local species: ${atlanticSpecies.length}`);

  if (pacificSpecies.length > 0) {
    console.log('\n⚠️  Pacific species found (should be ZERO):');
    pacificSpecies.forEach(s => console.log(`  - ${s.species_name}`));
  }

  console.log(`\nExpected: ~54 species with NE_Atlantic region + 2 with NULL = ~56 total\n`);

  if (atlanticSpecies.length > 10) {
    console.log('Top 10 species:');
    atlanticSpecies.slice(0, 10).forEach(s => {
      console.log(`  ${s.confidence_percent}% - ${s.species_name}`);
    });
  } else if (atlanticSpecies.length > 0) {
    console.log('All species:');
    atlanticSpecies.forEach(s => {
      console.log(`  ${s.confidence_percent}% - ${s.species_name}`);
    });
  }

  // Final verdict
  console.log('\n=== Results ===');
  if (pacificSpecies.length === 0 && atlanticSpecies.length > 40) {
    console.log('🎉 SUCCESS! Biogeographic filtering working correctly!');
    console.log('   ✅ Pacific species blocked');
    console.log(`   ✅ Atlantic species included (${atlanticSpecies.length})`);
    console.log('\n✨ The fix is working! Asturias now shows proper Atlantic species.');
  } else if (pacificSpecies.length === 0 && atlanticSpecies.length <= 10) {
    console.log('⚠️  PARTIAL: Pacific species blocked but still too few Atlantic species');
    console.log(`   Expected ~56, got ${atlanticSpecies.length}`);
    console.log('   This means the migration may not have been applied yet.');
  } else {
    console.log('❌ FAILED: Still have issues');
    console.log(`   Pacific species: ${pacificSpecies.length}`);
    console.log(`   Atlantic species: ${atlanticSpecies.length}`);
  }
}

testFix().catch(console.error);
