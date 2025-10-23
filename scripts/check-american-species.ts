// Check what species exist for American regions
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAmericanSpecies() {
  console.log('Checking species for American regions...\n');

  const americanRegions = [
    'NW_Atlantic',
    'Caribbean',
    'Gulf_of_Mexico',
    'NE_Pacific',
    'Hawaii',
    'Gulf_of_Alaska',
    'Sea_of_Cortez',
    'US_Atlantic',
  ];

  for (const region of americanRegions) {
    const { data, count } = await supabase
      .from('species')
      .select('name_en, scientific_name', { count: 'exact' })
      .contains('biogeographic_regions', [region])
      .limit(5);

    console.log(`\n${region}:`);
    console.log(`  Total species: ${count || 0}`);
    if (data && data.length > 0) {
      console.log('  Examples:');
      data.forEach(s => console.log(`    - ${s.name_en} (${s.scientific_name})`));
    }
  }

  // Check all unique biogeographic regions
  console.log('\n\n=== All Unique Biogeographic Regions ===');
  const { data: allSpecies } = await supabase
    .from('species')
    .select('biogeographic_regions')
    .not('biogeographic_regions', 'is', null);

  const uniqueRegions = new Set<string>();
  allSpecies?.forEach((s: any) => {
    (s.biogeographic_regions as string[])?.forEach(r => uniqueRegions.add(r));
  });

  Array.from(uniqueRegions).sort().forEach(r => console.log(`  - ${r}`));
}

checkAmericanSpecies();
