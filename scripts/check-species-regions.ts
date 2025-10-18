import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkRegions() {
  // Get all columns from species table
  const { data: sample } = await supabase
    .from('species')
    .select('*')
    .limit(1);
    
  const allColumns = Object.keys(sample?.[0] || {});
  const regionColumns = allColumns.filter(col => 
    col.toLowerCase().includes('region') || 
    col.toLowerCase().includes('area') ||
    col.toLowerCase().includes('ocean') ||
    col.toLowerCase().includes('sea')
  );
  
  console.log('Region-related columns in species table:', regionColumns);
  
  // Check a few species to see their region data
  const { data: species } = await supabase
    .from('species')
    .select('name_en, ' + (regionColumns.length > 0 ? regionColumns.join(', ') : 'species_code'))
    .in('name_en', ['Bogue', 'Sea Bass', 'Garfish', 'Mackerel', 'Plaice', 'Cod', 'Red Mullet', 'John Dory'])
    .order('name_en');
    
  console.log('\nSpecies region data:');
  species?.forEach(s => {
    console.log(`  ${s.name_en}:`, JSON.stringify(s, null, 2));
  });
}

checkRegions().catch(console.error);
