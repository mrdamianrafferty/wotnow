import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function queryRectangles() {
  const { data, error } = await supabase
    .from('ices_rectangles')
    .select('id, rectangle_code, center_lat, center_lon, cmems_region, distance_to_shore_km, is_coastal')
    .order('cmems_region', { ascending: true })
    .order('distance_to_shore_km', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  // Don't print all data, just stats
  console.error(`Total rectangles: ${data.length}`);
  
  // Group by region
  const byRegion = data.reduce((acc: Record<string, number>, r: any) => {
    const region = r.cmems_region || 'NULL';
    acc[region] = (acc[region] || 0) + 1;
    return acc;
  }, {});
  
  console.error('\nRectangles per region:');
  Object.entries(byRegion).sort((a, b) => b[1] - a[1]).forEach(([region, count]) => {
    console.error(`  ${region}: ${count}`);
  });
  
  // Categorize by distance from shore
  const offshore = data.filter(r => r.distance_to_shore_km && r.distance_to_shore_km > 10);
  const nearshore = data.filter(r => r.distance_to_shore_km && r.distance_to_shore_km >= 5 && r.distance_to_shore_km <= 10);
  const coastal = data.filter(r => r.distance_to_shore_km && r.distance_to_shore_km < 5);
  const unknown = data.filter(r => !r.distance_to_shore_km || r.distance_to_shore_km === 0);
  
  console.error('\nDistance categories:');
  console.error(`  Offshore (>10km): ${offshore.length}`);
  console.error(`  Nearshore (5-10km): ${nearshore.length}`);
  console.error(`  Coastal (<5km): ${coastal.length}`);
  console.error(`  Unknown/Zero: ${unknown.length}`);
  
  // Sample rectangles for testing - 2 from each region per category
  console.error('\n\n=== SAMPLE RECTANGLES FOR TESTING ===\n');
  
  const regions = ['IBI', 'NWS', 'BAL', 'MED', 'BLK', 'ARC', 'GLO'];
  const testSamples: any = {};
  
  for (const region of regions) {
    const regionRects = data.filter(r => r.cmems_region === region);
    const offshoreRects = regionRects.filter(r => r.distance_to_shore_km && r.distance_to_shore_km > 10);
    const nearshoreRects = regionRects.filter(r => r.distance_to_shore_km && r.distance_to_shore_km >= 5 && r.distance_to_shore_km <= 10);
    const coastalRects = regionRects.filter(r => r.distance_to_shore_km && r.distance_to_shore_km < 5 && r.distance_to_shore_km > 0);
    
    testSamples[region] = {
      offshore: offshoreRects.slice(0, 2),
      nearshore: nearshoreRects.slice(0, 2),
      coastal: coastalRects.slice(0, 2)
    };
    
    console.error(`\n${region}:`);
    console.error(`  Total: ${regionRects.length}`);
    console.error(`  Offshore: ${offshoreRects.length}, Nearshore: ${nearshoreRects.length}, Coastal: ${coastalRects.length}`);
    
    if (testSamples[region].offshore.length > 0) {
      console.error(`  Test offshore: ${testSamples[region].offshore.map((r: any) => r.rectangle_code).join(', ')}`);
    }
    if (testSamples[region].nearshore.length > 0) {
      console.error(`  Test nearshore: ${testSamples[region].nearshore.map((r: any) => r.rectangle_code).join(', ')}`);
    }
    if (testSamples[region].coastal.length > 0) {
      console.error(`  Test coastal: ${testSamples[region].coastal.map((r: any) => r.rectangle_code).join(', ')}`);
    }
  }
  
  // Output JSON for automated testing
  console.log(JSON.stringify(testSamples, null, 2));
}

queryRectangles();
