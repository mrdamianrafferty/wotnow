import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://swmviqpxetwziqxhzldh.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkSchema() {
  // Check what columns exist in species table
  const { data, error } = await supabase
    .from('species')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Species table columns:', Object.keys(data[0] || {}));
  
  // Check if there's a region or biogeographic column
  const columns = Object.keys(data[0] || {});
  const regionColumns = columns.filter(col => 
    col.toLowerCase().includes('region') || 
    col.toLowerCase().includes('biogeographic') ||
    col.toLowerCase().includes('atlantic') ||
    col.toLowerCase().includes('mediterranean')
  );
  
  console.log('\nRegion-related columns:', regionColumns.length > 0 ? regionColumns : 'None found');
  
  // Check a few species with temp preferences
  const { data: tempData } = await supabase
    .from('species')
    .select('name_en, temp_opt_c, species_code')
    .in('name_en', ['Bogue', 'Sea Bass', 'Garfish', 'Mackerel'])
    .order('name_en');
    
  console.log('\nSample species temperature preferences:');
  tempData?.forEach(s => {
    console.log(`  ${s.name_en}: ${s.temp_opt_c || 'null'}`);
  });
}

checkSchema().catch(console.error);
