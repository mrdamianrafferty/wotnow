/**
 * Check Recent Catches - Diagnostic Script
 *
 * Checks the most recent catch entries in the database to verify:
 * 1. What species_id values were saved
 * 2. Whether those species_id values exist in the species table
 * 3. What the actual common names are
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentCatches() {
  console.log('🔍 Checking recent catch entries...\n');

  // Get the 10 most recent catches
  const { data: catches, error: catchError } = await supabase
    .from('findr_catch_entries')
    .select('id, species_id, species_common_name, caught_at, user_id')
    .order('caught_at', { ascending: false })
    .limit(10);

  if (catchError) {
    console.error('Error fetching catches:', catchError);
    return;
  }

  if (!catches || catches.length === 0) {
    console.log('No catches found');
    return;
  }

  console.log(`Found ${catches.length} recent catches:\n`);

  for (const catchEntry of catches) {
    console.log(`Catch ID: ${catchEntry.id}`);
    console.log(`  Species ID: ${catchEntry.species_id}`);
    console.log(`  Common Name: ${catchEntry.species_common_name}`);
    console.log(`  Caught At: ${catchEntry.caught_at}`);

    // Check if this species_id exists in the species table
    const { data: species, error: speciesError } = await supabase
      .from('species')
      .select('id, species_code, name_en')
      .eq('id', catchEntry.species_id)
      .single();

    if (speciesError || !species) {
      console.log(`  ❌ ERROR: species_id "${catchEntry.species_id}" NOT FOUND in species table`);

      // Try to find by common name
      const { data: nameMatch } = await supabase
        .from('species')
        .select('id, species_code, name_en')
        .ilike('name_en', `%${catchEntry.species_common_name}%`)
        .limit(3);

      if (nameMatch && nameMatch.length > 0) {
        console.log(`  💡 Possible matches by name:`);
        nameMatch.forEach(s => {
          console.log(`     - code: ${s.species_code}, id: ${s.id}, name: ${s.name_en}`);
        });
      }
    } else {
      console.log(`  ✅ Found in species table: code="${species.species_code}", name="${species.name_en}"`);
    }

    console.log('');
  }
}

checkRecentCatches()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
