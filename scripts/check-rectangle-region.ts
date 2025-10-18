import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function check() {
  // Check rectangle region
  const { data: rect } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region')
    .eq('rectangle_code', '25E1')
    .single();
    
  console.log('Rectangle 25E1 region:', rect?.region);
  
  // Check species with that region
  const { data: species } = await supabase
    .from('species')
    .select('name_en, biogeographic_regions')
    .limit(5);
    
  console.log('\nSample species regions:');
  species?.forEach(s => {
    console.log(`${s.name_en}: ${JSON.stringify(s.biogeographic_regions)}`);
  });
}

check().catch(console.error);
