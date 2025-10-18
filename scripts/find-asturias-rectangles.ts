import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function find() {
  // Check if 25E1 exists in ices_rectangles
  const { data: rect25E1 } = await supabase
    .from('ices_rectangles')
    .select('*')
    .eq('rectangle_code', '25E1')
    .single();
    
  console.log('Rectangle 25E1:', rect25E1 ? `✅ Exists (${rect25E1.region}, ${rect25E1.distance_to_shore_km}km from shore)` : '❌ Not found');
  
  // Find Asturian rectangles (Bay of Biscay region)
  const { data: biscayRects } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, distance_to_shore_km, center_lat, center_lon')
    .or('region.eq.Bay of Biscay,region.eq.IBI')
    .lte('distance_to_shore_km', 30)
    .order('rectangle_code');
    
  console.log(`\n✅ Found ${biscayRects?.length || 0} Bay of Biscay/IBI rectangles within 30km:\n`);
  biscayRects?.slice(0, 15).forEach(r => {
    console.log(`  ${r.rectangle_code} - ${r.region} (${r.distance_to_shore_km?.toFixed(1)}km) - Lat:${r.center_lat}, Lon:${r.center_lon}`);
  });
  
  // Check which ones have data
  if (biscayRects && biscayRects.length > 0) {
    const codes = biscayRects.map(r => r.rectangle_code);
    const { data: withData } = await supabase
      .from('findr_conditions_snapshots')
      .select('rectangle_code')
      .in('rectangle_code', codes)
      .limit(1000);
      
    const codesWithData = new Set(withData?.map(d => d.rectangle_code) || []);
    console.log(`\n📊 ${codesWithData.size}/${biscayRects.length} have environmental data`);
    
    const missing = biscayRects.filter(r => !codesWithData.has(r.rectangle_code));
    if (missing.length > 0) {
      console.log(`\n❌ Missing data for ${missing.length} rectangles:`);
      missing.slice(0, 10).forEach(r => console.log(`  - ${r.rectangle_code}`));
    }
  }
}

find().catch(console.error);
