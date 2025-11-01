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

async function checkSpeciesCodes() {
  console.log('🔍 Checking species table for common codes...\n');

  const codes = ['MAC', 'BSS', 'COD', 'HER', 'POL', 'WRB', 'DEX'];

  for (const code of codes) {
    const { data, error } = await supabase
      .from('species')
      .select('id, species_code, common_name_en')
      .eq('species_code', code)
      .single();

    if (error || !data) {
      console.log(`❌ Code "${code}": NOT FOUND`);
    } else {
      console.log(`✅ Code "${code}": ${data.common_name_en} (ID: ${data.id})`);
    }
  }

  console.log('\n📊 Sample of species table:');
  const { data: sample } = await supabase
    .from('species')
    .select('id, species_code, common_name_en')
    .limit(10);

  if (sample) {
    sample.forEach(s => {
      console.log(`  ${s.species_code}: ${s.common_name_en} (ID: ${s.id})`);
    });
  }
}

checkSpeciesCodes()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
