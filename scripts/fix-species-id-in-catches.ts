import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSpeciesIds() {
  console.log('🔧 Fixing species_id values in catch entries...\n');

  // First, let's see how many entries need fixing
  const { count: totalBroken } = await supabase
    .from('findr_catch_entries')
    .select('*', { count: 'exact', head: true })
    .not('species_id', 'like', '%-%-%-%-%');

  console.log(`📊 Found ${totalBroken} catch entries with invalid species_id (codes instead of UUIDs)\n`);

  // Get all broken entries
  const { data: brokenEntries, error: fetchError } = await supabase
    .from('findr_catch_entries')
    .select('id, species_id')
    .not('species_id', 'like', '%-%-%-%-%');

  if (fetchError) {
    console.error('❌ Error fetching broken entries:', fetchError);
    process.exit(1);
  }

  if (!brokenEntries || brokenEntries.length === 0) {
    console.log('✅ No entries need fixing!');
    process.exit(0);
  }

  console.log(`🔍 Processing ${brokenEntries.length} entries...\n`);

  let fixed = 0;
  let failed = 0;

  for (const entry of brokenEntries) {
    // Look up the UUID for this species code
    const { data: species, error: speciesError } = await supabase
      .from('species')
      .select('id')
      .eq('species_code', entry.species_id)
      .single();

    if (speciesError || !species) {
      console.log(`❌ No species found for code: ${entry.species_id}`);
      failed++;
      continue;
    }

    // Update the catch entry with the correct UUID
    const { error: updateError } = await supabase
      .from('findr_catch_entries')
      .update({ species_id: species.id })
      .eq('id', entry.id);

    if (updateError) {
      console.log(`❌ Failed to update entry ${entry.id}:`, updateError);
      failed++;
    } else {
      fixed++;
      process.stdout.write(`\r✅ Fixed ${fixed}/${brokenEntries.length} entries`);
    }
  }

  console.log(`\n\n🎉 Complete!`);
  console.log(`  ✅ Fixed: ${fixed}`);
  console.log(`  ❌ Failed: ${failed}`);
}

fixSpeciesIds()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
