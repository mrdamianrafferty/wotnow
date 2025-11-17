import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugJoin() {
  console.log('Investigating seasonality data join issue...\n');

  // Check what region 31F2 has
  const { data: rect } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region')
    .eq('rectangle_code', '31F2')
    .single();

  console.log('Rectangle 31F2 region:', rect);

  // Check how many seasonality entries exist total
  const { data: srs, count } = await supabase
    .from('species_region_seasonality')
    .select('*', { count: 'exact', head: true });

  console.log('\nTotal seasonality entries:', count);

  if (rect) {
    // Check if there are any for this specific region
    const { data: srsRegion, count: regionCount } = await supabase
      .from('species_region_seasonality')
      .select('*', { count: 'exact', head: true })
      .eq('region_code', rect.region);

    console.log(`\nSeasonality entries for region '${rect.region}':`, regionCount);

    // Get a sample
    const { data: sample } = await supabase
      .from('species_region_seasonality')
      .select('*')
      .eq('region_code', rect.region)
      .limit(3);

    console.log('\nSample entries:');
    console.log(JSON.stringify(sample, null, 2));
  }
}

debugJoin().catch(console.error);
