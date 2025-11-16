import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get all rectangles
  const { data: rects } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon')
    .order('rectangle_code');

  // Get all rectangles that have data
  const { data: withData } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code')
    .not('rectangle_code', 'is', null);

  const rectsWithData = new Set(withData?.map(r => r.rectangle_code) || []);

  console.log('Rectangles WITHOUT data (need coordinate verification):');
  console.log('Code,Latitude,Longitude');
  console.log('');

  const problematic = rects?.filter(r => rectsWithData.has(r.rectangle_code) === false) || [];

  problematic.forEach(r => {
    console.log(`${r.rectangle_code},${r.center_lat.toFixed(4)},${r.center_lon.toFixed(4)}`);
  });

  console.log('');
  console.log(`Total rectangles: ${rects?.length || 0}`);
  console.log(`With data: ${rectsWithData.size}`);
  console.log(`Without data: ${problematic.length}`);
}

main().catch(console.error);
