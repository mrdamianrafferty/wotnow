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

async function findBluefish() {
  console.log('🔍 Searching for Bluefish...\n');

  // Search by UUID
  console.log('1. Search by UUID 6584ac8d-15a1-43bd-a3b3-8d45bc482814:');
  const { data: byId, error: idError } = await supabase
    .from('species')
    .select('id, species_code, name_en, slug')
    .eq('id', '6584ac8d-15a1-43bd-a3b3-8d45bc482814')
    .single();

  if (idError || !byId) {
    console.log('   ❌ Not found by UUID');
  } else {
    console.log(`   ✅ Found: ${byId.name_en} (code: ${byId.species_code}, slug: ${byId.slug})`);
  }

  // Search by species_code "BLUEFISH"
  console.log('\n2. Search by species_code "BLUEFISH":');
  const { data: byCode, error: codeError } = await supabase
    .from('species')
    .select('id, species_code, name_en, slug')
    .eq('species_code', 'BLUEFISH')
    .single();

  if (codeError || !byCode) {
    console.log('   ❌ Not found by code "BLUEFISH"');
  } else {
    console.log(`   ✅ Found: ${byCode.name_en} (id: ${byCode.id}, slug: ${byCode.slug})`);
  }

  // Search by name
  console.log('\n3. Search by name containing "Bluefish":');
  const { data: byName, error: nameError } = await supabase
    .from('species')
    .select('id, species_code, name_en, slug')
    .ilike('name_en', '%Bluefish%');

  if (nameError || !byName || byName.length === 0) {
    console.log('   ❌ Not found by name');
  } else {
    console.log(`   ✅ Found ${byName.length} result(s):`);
    byName.forEach(s => {
      console.log(`      - ${s.name_en} (code: ${s.species_code}, id: ${s.id})`);
    });
  }

  // Check user_favourites table for this UUID
  console.log('\n4. Check user_favourites table:');
  const { data: favs } = await supabase
    .from('user_favourites')
    .select('user_id, species_id')
    .eq('species_id', '6584ac8d-15a1-43bd-a3b3-8d45bc482814')
    .limit(5);

  if (favs && favs.length > 0) {
    console.log(`   ⚠️  Found ${favs.length} user(s) with this UUID in favourites`);
    console.log(`   This needs to be fixed!`);
  } else {
    console.log('   ✅ No favourites with this UUID');
  }
}

findBluefish()
  .then(() => {
    console.log('\n✅ Search complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
