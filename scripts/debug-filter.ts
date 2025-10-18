import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function debug() {
  // Count species by region status
  const { data: allSpecies } = await supabase
    .from('species')
    .select('name_en, biogeographic_regions');
    
  const withRegions = allSpecies?.filter(s => s.biogeographic_regions && s.biogeographic_regions.length > 0) || [];
  const withBiscay = withRegions.filter(s => s.biogeographic_regions.includes('Bay of Biscay'));
  
  console.log(`Total species: ${allSpecies?.length || 0}`);
  console.log(`With regions: ${withRegions.length}`);
  console.log(`With "Bay of Biscay": ${withBiscay.length}\n`);
  
  if (withBiscay.length > 0) {
    console.log('Species with Bay of Biscay:');
    withBiscay.slice(0, 10).forEach(s => console.log(`  - ${s.name_en}`));
  }
}

debug().catch(console.error);
