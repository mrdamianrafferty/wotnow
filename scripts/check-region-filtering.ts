import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Supabase URL:', supabaseUrl);
console.log('Key present:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRegionFiltering() {
  // Test: Get rectangle info
  const { data: rectData } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region')
    .in('rectangle_code', ['25E1', '28E5'])
    .order('rectangle_code');
    
  console.log('\nRectangle regions:');
  rectData?.forEach(r => {
    console.log(`  ${r.rectangle_code}: ${r.region}`);
  });
  
  // Check some species temp preferences to identify Mediterranean vs Atlantic
  const { data: speciesData } = await supabase
    .from('species')
    .select('name_en, temp_opt_c, species_code')
    .in('name_en', ['Bogue', 'Sea Bass', 'Garfish', 'Mackerel', 'Plaice', 'Cod'])
    .order('temp_opt_c');
    
  console.log('\nSpecies temperature preferences (sorted by temp):');
  speciesData?.forEach(s => {
    const temp = s.temp_opt_c || [];
    console.log(`  ${s.name_en}: ${temp[0]}-${temp[1]}°C ${temp[0] >= 16 ? '🌡️ MEDITERRANEAN' : '🌊 ATLANTIC'}`);
  });
  
  // Test: See what Bogue is classified as
  const { data: bogueData } = await supabase
    .from('species')
    .select('*')
    .eq('name_en', 'Bogue')
    .single();
    
  console.log('\nBogue (Mediterranean species) details:');
  console.log('  Temp optimal:', bogueData?.temp_opt_c);
  console.log('  Has region column?', 'biogeographic_region' in (bogueData || {}));
  console.log('  All columns:', Object.keys(bogueData || {}).filter(k => k.includes('region') || k.includes('bio')).join(', '));
}

checkRegionFiltering().catch(console.error);
