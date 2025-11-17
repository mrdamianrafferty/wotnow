import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function querySeasonality() {
  console.log('Querying species_region_seasonality table...\n');

  // Get sample seasonality entries
  const { data: seasonality } = await supabase
    .from('species_region_seasonality')
    .select('region_code, species_id')
    .limit(10);

  console.log('Sample species_region_seasonality entries:');
  console.log(JSON.stringify(seasonality, null, 2));

  // Get distinct region codes
  const { data: allRegions } = await supabase
    .from('species_region_seasonality')
    .select('region_code')
    .order('region_code');

  if (allRegions) {
    const uniqueRegions = [...new Set(allRegions.map(r => r.region_code))];
    console.log('\n\nDistinct region_code values in species_region_seasonality:');
    uniqueRegions.forEach(r => console.log(`  - ${r}`));
    console.log(`\nTotal unique regions: ${uniqueRegions.length}`);
  }
}

querySeasonality().catch(console.error);
