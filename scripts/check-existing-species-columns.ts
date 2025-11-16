import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkExistingColumns() {
  console.log('Checking existing species and bio_bands columns...\n');

  // Get species table columns
  const { data: speciesData } = await supabase.from('species').select('*').limit(1);
  console.log('SPECIES TABLE COLUMNS:');
  console.log('═'.repeat(60));
  if (speciesData && speciesData[0]) {
    console.log(Object.keys(speciesData[0]).sort().join(', '));
  }
  console.log('');

  // Get bio_bands table columns
  const { data: bioBandsData } = await supabase.from('bio_bands').select('*').limit(1);
  console.log('BIO_BANDS TABLE COLUMNS:');
  console.log('═'.repeat(60));
  if (bioBandsData && bioBandsData[0]) {
    console.log(Object.keys(bioBandsData[0]).sort().join(', '));
  }
  console.log('');

  // Sample a species record to see the data
  const { data: sampleSpecies } = await supabase.from('species').select('*').eq('code', 'MAC').single();
  console.log('SAMPLE SPECIES (Mackerel - MAC):');
  console.log('═'.repeat(60));
  console.log(JSON.stringify(sampleSpecies, null, 2));
  console.log('');

  // Sample another species
  const { data: sampleBass } = await supabase.from('species').select('*').eq('code', 'BSS').single();
  console.log('SAMPLE SPECIES (Bass - BSS):');
  console.log('═'.repeat(60));
  console.log(JSON.stringify(sampleBass, null, 2));
  console.log('');

  // Sample a bio_band record
  const { data: sampleBioBand } = await supabase.from('bio_bands').select('*').limit(1).single();
  console.log('SAMPLE BIO_BAND:');
  console.log('═'.repeat(60));
  console.log(JSON.stringify(sampleBioBand, null, 2));
}

checkExistingColumns().catch(console.error);
