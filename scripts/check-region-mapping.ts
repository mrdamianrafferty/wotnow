// Check what regions are actually in the database vs what the function expects
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRegionMapping() {
  console.log('Checking region mapping mismatch...\n');

  // Get all unique regions from species
  const { data: allSpecies } = await supabase
    .from('species')
    .select('biogeographic_regions')
    .not('biogeographic_regions', 'is', null);

  const uniqueRegions = new Set<string>();
  allSpecies?.forEach((s: any) => {
    (s.biogeographic_regions as string[])?.forEach(r => uniqueRegions.add(r));
  });

  console.log('Regions in species table:');
  Array.from(uniqueRegions).sort().forEach(r => console.log(`  - ${r}`));

  console.log('\nRegions the function maps to:');
  const functionRegions = [
    'Atlantic',
    'Bay of Biscay',
    'Mediterranean',
    'Celtic Sea',
    'English Channel',
    'Irish Sea',
    'North Sea',
  ];
  functionRegions.forEach(r => {
    const inDb = uniqueRegions.has(r);
    console.log(`  ${inDb ? '✅' : '❌'} ${r}`);
  });

  console.log('\n🔍 Analysis:');
  console.log('The function maps rectangle 31F1 (English Channel) to "English Channel"');
  console.log('But species have regions like "NE_Atlantic" and "Mediterranean"');
  console.log('These don\'t match, so no species are returned!');

  console.log('\n💡 Solution:');
  console.log('Update the function to map rectangles to the actual region names:');
  console.log('  - English Channel rectangles → NE_Atlantic');
  console.log('  - Celtic Sea rectangles → NE_Atlantic');
  console.log('  - North Sea rectangles → NE_Atlantic');
  console.log('  - Mediterranean rectangles → Mediterranean');
  console.log('  - Atlantic rectangles → NE_Atlantic or NW_Atlantic based on longitude');
}

checkRegionMapping();
