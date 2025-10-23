// Check what rectangle codes exist in the database
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRectangles() {
  console.log('Checking rectangle codes in database...\n');

  // Check sample rectangles to understand the system
  const { data, error } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, center_lat, center_lon')
    .order('rectangle_code')
    .limit(20);

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('Sample ICES rectangles:');
    data?.forEach(r => {
      console.log(`  ${r.rectangle_code}: ${r.region} (lat: ${r.center_lat}, lon: ${r.center_lon})`);
    });
  }

  // Check total count
  const { count } = await supabase
    .from('ices_rectangles')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✅ Total rectangles in database: ${count}`);

  // Get all codes to see range
  const { data: allCodes } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code')
    .order('rectangle_code');

  if (allCodes) {
    console.log('\nFirst 10 codes:', allCodes.slice(0, 10).map(r => r.rectangle_code).join(', '));
    console.log('Last 10 codes:', allCodes.slice(-10).map(r => r.rectangle_code).join(', '));

    // Check for any American-looking codes
    const americanCodes = allCodes.filter(r =>
      !r.rectangle_code.match(/^\d{2}[A-Z]\d$/) // Not standard ICES format
    );

    if (americanCodes.length > 0) {
      console.log(`\n🌎 Found ${americanCodes.length} non-standard rectangle codes (possibly American):`);
      americanCodes.slice(0, 20).forEach(r => console.log(`  - ${r.rectangle_code}`));
    }
  }
}

checkRectangles();
