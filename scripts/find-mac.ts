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

async function findMAC() {
  console.log('🔍 Searching for species with code "MAC"...\n');

  const { data, error } = await supabase
    .from('species')
    .select('id, species_code, name_en, slug')
    .eq('species_code', 'MAC')
    .single();

  if (error || !data) {
    console.log('❌ No species found with species_code = "MAC"');
    console.log('\n🔍 Searching for Atlantic Mackerel instead...');
    
    const { data: atlantic } = await supabase
      .from('species')
      .select('id, species_code, name_en, slug')
      .ilike('name_en', '%Atlantic Mackerel%');
    
    if (atlantic && atlantic.length > 0) {
      console.log('✅ Found Atlantic Mackerel:');
      atlantic.forEach(s => {
        console.log(`   - ${s.name_en} (code: ${s.species_code}, id: ${s.id})`);
      });
    } else {
      console.log('❌ No Atlantic Mackerel found either');
    }
  } else {
    console.log(`✅ Found: ${data.name_en} (code: ${data.species_code}, id: ${data.id})`);
  }
  
  // Also check what species_id is currently in the Mackerel catches
  console.log('\n🔍 Checking what species_id the "Mackerel" catches have:');
  const { data: catches } = await supabase
    .from('findr_catch_entries')
    .select('species_id, species_common_name')
    .eq('species_common_name', 'Mackerel')
    .limit(1);
    
  if (catches && catches.length > 0) {
    console.log(`   Current species_id in catches: ${catches[0].species_id}`);
  }
}

findMAC()
  .then(() => {
    console.log('\n✅ Search complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
