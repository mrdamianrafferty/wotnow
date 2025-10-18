import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkSpeciesCodes() {
  const { data } = await supabase
    .from('species')
    .select('name_en, species_code')
    .in('name_en', ['Bogue', 'Sea Bass', 'Cod', 'Plaice', 'Mackerel', 'Garfish'])
    .order('name_en');
    
  console.log('Species codes:');
  data?.forEach(s => {
    console.log(`  ${s.name_en}: "${s.species_code}"`);
  });
}

checkSpeciesCodes().catch(console.error);
