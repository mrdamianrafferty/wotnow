import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkPopulatedRegions() {
  const { data } = await supabase
    .from('species')
    .select('name_en, biogeographic_regions')
    .not('biogeographic_regions', 'is', null)
    .limit(20);
    
  console.log('Sample species with biogeographic_regions:');
  data?.forEach(s => {
    console.log(`  ${s.name_en}: ${s.biogeographic_regions?.join(', ')}`);
  });
  
  //  Check Bay of Biscay in ices_rectangles
  const { data: rect } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region')
    .eq('rectangle_code', '25E1')
    .single();
    
  console.log(`\n25E1 rectangle region: "${rect?.region}"`);
  console.log('\nThe filter checks if rectangle region matches ANY region in species array.');
  console.log('Problem: "Bay of Biscay" from rectangle != "Bay of Biscay" in species regions');
}

checkPopulatedRegions().catch(console.error);
