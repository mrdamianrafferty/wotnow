// Check the grid structure with ICES metadata
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkGridStructure() {
  console.log('Checking grid/rectangle structure...\n');

  // Get sample records to see the structure
  const { data, error } = await supabase
    .from('ices_rectangles')
    .select('*')
    .limit(3);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample records (showing all columns):');
  console.log(JSON.stringify(data, null, 2));

  // Check for American regions by latitude/longitude
  console.log('\n\n=== Checking for American grids (by longitude) ===');

  // Western hemisphere (negative longitude) should be Americas
  const { data: westernGrids } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, center_lat, center_lon')
    .lt('center_lon', -10)  // West of Europe
    .order('center_lon')
    .limit(10);

  console.log('Western Hemisphere grids:');
  westernGrids?.forEach(r => {
    console.log(`  ${r.rectangle_code}: ${r.region} (lat: ${r.center_lat}, lon: ${r.center_lon})`);
  });

  // Check Pacific (positive longitude > 150 or negative < -100)
  const { data: pacificGrids } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, center_lat, center_lon')
    .or('center_lon.gt.150,center_lon.lt.-100')
    .limit(10);

  console.log('\n\nPacific grids:');
  if (pacificGrids && pacificGrids.length > 0) {
    pacificGrids.forEach(r => {
      console.log(`  ${r.rectangle_code}: ${r.region} (lat: ${r.center_lat}, lon: ${r.center_lon})`);
    });
  } else {
    console.log('  None found');
  }
}

checkGridStructure();
