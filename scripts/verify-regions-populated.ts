import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function verifyRegions() {
  console.log('Checking biogeographic_regions population...\n');
  
  // Count species with regions
  const { count: totalCount } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true });
    
  const { count: withRegions } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true })
    .not('biogeographic_regions', 'is', null);
  
  console.log(`Total species: ${totalCount}`);
  console.log(`Species with regions: ${withRegions}`);
  console.log(`${withRegions === totalCount ? '✅' : '❌'} ${withRegions === totalCount ? 'All species have regions' : 'Some species missing regions'}\n`);
  
  // Sample a few species
  const { data: samples } = await supabase
    .from('species')
    .select('name_en, biogeographic_regions')
    .in('name_en', ['Bogue', 'Sea Bass', 'Cod', 'Plaice', 'Mackerel', 'Garfish'])
    .order('name_en');
  
  console.log('Sample species regions:');
  samples?.forEach(s => {
    const regions = s.biogeographic_regions || [];
    console.log(`  ${s.name_en}: ${regions.length > 0 ? regions.join(', ') : 'NO REGIONS SET'}`);
  });
  
  // Check rectangle region
  const { data: rect } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region')
    .eq('rectangle_code', '25E1')
    .single();
    
  console.log(`\nRectangle 25E1 region: "${rect?.region}"`);
  
  // Check if any species have "Bay of Biscay" in their regions
  const { data: biscaySpecies } = await supabase
    .from('species')
    .select('name_en, biogeographic_regions')
    .contains('biogeographic_regions', ['Bay of Biscay'])
    .limit(5);
    
  console.log(`\nSpecies with "Bay of Biscay" in regions: ${biscaySpecies?.length || 0}`);
  biscaySpecies?.slice(0, 3).forEach(s => {
    console.log(`  - ${s.name_en}`);
  });
}

verifyRegions().catch(console.error);
