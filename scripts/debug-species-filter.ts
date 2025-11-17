import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugSpeciesFilter() {
  console.log('=== SPECIES DATA ANALYSIS ===\n');

  // 1. Check for squid, crayfish, sea trout
  console.log('1. Checking for squid, crayfish, sea trout in database:\n');
  const { data: specialSpecies } = await supabase
    .from('species')
    .select('species_code, name_en, catches_2024, peak_months, good_months, possible_months')
    .or('name_en.ilike.%squid%,name_en.ilike.%crayfish%,name_en.ilike.%trout%');

  console.log(JSON.stringify(specialSpecies, null, 2));

  // 2. Check total species count with and without catches_2024
  console.log('\n2. Species with/without catches_2024:\n');
  const { data: allSpecies } = await supabase
    .from('species')
    .select('species_code, name_en, catches_2024');

  const withCatches = allSpecies?.filter(s => s.catches_2024 !== null) || [];
  const withoutCatches = allSpecies?.filter(s => s.catches_2024 === null) || [];

  console.log(`Total species: ${allSpecies?.length}`);
  console.log(`With catches_2024: ${withCatches.length}`);
  console.log(`Without catches_2024: ${withoutCatches.length}`);

  if (withoutCatches.length > 0) {
    console.log('\nSpecies WITHOUT catches_2024:');
    withoutCatches.slice(0, 10).forEach(s => {
      console.log(`  - ${s.species_code}: ${s.name_en}`);
    });
  }

  // 3. Check what get_fishing_confidence_v2 returns for 25E0
  console.log('\n3. Running get_fishing_confidence_v2 for 25E0:\n');
  const { data: v2Results, error: v2Error } = await supabase.rpc('get_fishing_confidence_v2', {
    target_rectangle: '25E0',
    target_date: new Date().toISOString().split('T')[0],
    target_month: new Date().getMonth() + 1
  });

  if (v2Error) {
    console.error('V2 Error:', v2Error);
  } else {
    console.log(`Found ${v2Results?.length || 0} species from V2`);
    if (v2Results && v2Results.length > 0) {
      console.log('\nV2 Species list:');
      v2Results.forEach((r: any) => {
        console.log(`  ${r.species_code} - ${r.species_name}: ${r.confidence_percent}%`);
      });
    }
  }

  // 4. Check if get_global_fishing_predictions exists and what it returns
  console.log('\n4. Checking get_global_fishing_predictions fallback:\n');
  const { data: globalResults, error: globalError } = await supabase.rpc('get_global_fishing_predictions', {
    user_lat: 50.0,
    user_lon: -5.0,
    target_date: new Date().toISOString().split('T')[0],
    p_lang: 'en'
  });

  if (globalError) {
    console.error('Global Error:', globalError);
  } else {
    console.log(`Found ${globalResults?.length || 0} species from global predictions`);
    if (globalResults && globalResults.length > 0) {
      console.log('\nGlobal predictions species (first 10):');
      globalResults.slice(0, 10).forEach((r: any) => {
        console.log(`  ${r.species_code || r.code} - ${r.species_name || r.name}: ${r.confidence_percent || r.confidence}%`);
      });
    }
  }
}

debugSpeciesFilter().catch(console.error);
