import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRectangles() {
  // Check 28E5 and nearby rectangles in IBI region
  const { data: ibiRectangles } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, cmems_region, center_lat, center_lon')
    .eq('cmems_region', 'IBI')
    .order('rectangle_code')
    .limit(20);

  if (ibiRectangles) {
    console.log('\n=== IBI Region Rectangles ===');
    for (const rect of ibiRectangles) {
      const marker = rect.rectangle_code === '28E5' ? ' <-- PROBLEM' : '';
      console.log(`${rect.rectangle_code}: region="${rect.region}"${marker}`);
    }
  }
  
  // Find rectangles near 28E5 coordinates (around 43.75, -5.25)
  console.log('\n=== Rectangles near 28E5 location (43.75, -5.25) ===');
  const { data: nearbyRectangles } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, cmems_region, center_lat, center_lon')
    .gte('center_lat', 43.0)
    .lte('center_lat', 44.5)
    .gte('center_lon', -6.0)
    .lte('center_lon', -4.5)
    .order('rectangle_code')
    .limit(10);
    
  if (nearbyRectangles) {
    for (const rect of nearbyRectangles) {
      const distance = Math.sqrt(
        Math.pow(rect.center_lat - 43.75, 2) + 
        Math.pow(rect.center_lon - -5.25, 2)
      );
      console.log(`${rect.rectangle_code}: region="${rect.region}" (distance: ${distance.toFixed(2)})`);
    }
  }
}

checkRectangles();
