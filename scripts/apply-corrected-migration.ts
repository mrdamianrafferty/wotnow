import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

async function applyFix() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Reading corrected migration...');
  const sql = readFileSync(
    '/Users/damianrafferty/Projects/WotNow/supabase/migrations/20251118000002_fix_biogeographic_region_codes.sql',
    'utf-8'
  );

  console.log('Applying corrected biogeographic region mapping...');

  // Execute the function replacement via RPC
  const { error } = await supabase.rpc('exec_sql' as any, { sql });

  if (error) {
    console.error('Error applying via exec_sql, trying direct query...');
    // If exec_sql doesn't exist, we'll need to use the REST API directly
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      console.error('Direct query failed. We need to use psql or Supabase dashboard.');
      console.error('Please apply the migration manually using Supabase dashboard or psql.');
      console.log('\nMigration file location:');
      console.log('/Users/damianrafferty/Projects/WotNow/supabase/migrations/20251118000002_fix_biogeographic_region_codes.sql');
      process.exit(1);
    }
  }

  console.log('✅ Function updated successfully!');

  // Now clear cache for 28E5
  console.log('\nClearing cache for rectangle 28E5...');
  const { error: delError } = await supabase
    .from('findr_prediction_sessions')
    .delete()
    .eq('rectangle_code', '28E5');

  if (delError) {
    console.error('Cache clear error:', delError);
  } else {
    console.log('✅ Cache cleared');
  }

  // Test the fix
  console.log('\n=== Testing Corrected Biogeographic Filtering ===\n');
  console.log('Testing rectangle 28E5 (Asturias, IBI region → NE_Atlantic)...');

  const { data, error: testError } = await supabase
    .rpc('get_fishing_confidence_v3', {
      target_rectangle: '28E5',
      target_date: '2025-11-18',
      target_month: 11
    });

  if (testError) {
    console.error('Test error:', testError);
    process.exit(1);
  }

  console.log(`\nTotal species returned: ${data?.length || 0}`);

  // Check for Pacific species (should be NONE)
  const pacificSpecies = data?.filter(s =>
    s.species_name?.toLowerCase().includes('pacific') ||
    s.species_code === 'PWS' // Pacific White Seabass
  ) || [];

  console.log(`Pacific species: ${pacificSpecies.length} ${pacificSpecies.length === 0 ? '✅' : '❌'}`);

  if (pacificSpecies.length > 0) {
    console.log('  Pacific species found (SHOULD BE ZERO):');
    pacificSpecies.forEach(s => console.log(`    - ${s.species_name}`));
  }

  // Check for expected Atlantic species
  const atlanticSpecies = data?.filter(s =>
    !s.species_name?.toLowerCase().includes('pacific')
  ) || [];

  console.log(`Atlantic/local species: ${atlanticSpecies.length}`);
  console.log(`Expected: ~54 with NE_Atlantic region + 2 with NULL = ~56 total\n`);

  if (atlanticSpecies.length > 10) {
    console.log('Top 10 species:');
    atlanticSpecies.slice(0, 10).forEach(s => {
      console.log(`  - ${s.species_name} (${s.confidence_percent}%)`);
    });
  } else if (atlanticSpecies.length > 0) {
    console.log('All species:');
    atlanticSpecies.forEach(s => {
      console.log(`  - ${s.species_name} (${s.confidence_percent}%)`);
    });
  }

  // Final verdict
  console.log('\n=== Results ===');
  if (pacificSpecies.length === 0 && atlanticSpecies.length > 40) {
    console.log('🎉 SUCCESS! Biogeographic filtering working correctly!');
    console.log('   - Pacific species blocked ✅');
    console.log(`   - Atlantic species included (${atlanticSpecies.length}) ✅`);
  } else if (pacificSpecies.length === 0 && atlanticSpecies.length <= 10) {
    console.log('⚠️  PARTIAL: Pacific species blocked but too few Atlantic species');
    console.log(`   Expected ~56, got ${atlanticSpecies.length}`);
  } else {
    console.log('❌ FAILED: Still have issues with biogeographic filtering');
  }
}

applyFix().catch(console.error);
