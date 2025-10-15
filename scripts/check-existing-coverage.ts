import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!;
const supabase = createClient(url, key);

async function main() {
  console.log('🔍 Checking Existing Data Coverage in findr_conditions_snapshots\n');

  // Total rectangles
  const { count: totalRectangles } = await supabase
    .from('ices_rectangles')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total rectangles in database: ${totalRectangles}`);

  // Get all snapshots with their sources
  const { data: snapshots } = await supabase
    .from('findr_conditions_snapshots')
    .select('rectangle_code, snapshot_time, source_provider, data')
    .order('rectangle_code')
    .order('snapshot_time', { ascending: false });

  if (!snapshots || snapshots.length === 0) {
    console.log('\n❌ No snapshot data found in findr_conditions_snapshots table\n');
    return;
  }

  // Get unique rectangles with data
  const rectanglesWithData = new Set(snapshots.map(s => s.rectangle_code));
  
  console.log(`\n✅ Rectangles with snapshot data: ${rectanglesWithData.size}/${totalRectangles}`);
  console.log(`   Coverage: ${Math.round(rectanglesWithData.size / totalRectangles! * 100)}%`);

  // Group by source provider
  const byProvider = new Map<string, Set<string>>();
  
  for (const snap of snapshots) {
    const provider = snap.source_provider || 'unknown';
    if (!byProvider.has(provider)) {
      byProvider.set(provider, new Set());
    }
    byProvider.get(provider)!.add(snap.rectangle_code);
  }

  console.log('\n📋 Coverage by Provider:\n');
  
  for (const [provider, rectangles] of byProvider.entries()) {
    console.log(`   ${provider}: ${rectangles.size} rectangles (${Math.round(rectangles.size / totalRectangles! * 100)}%)`);
  }

  // Get rectangles WITHOUT data
  const { data: allRectangles } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, cmems_region, distance_to_shore_km');

  const rectanglesWithoutData = allRectangles?.filter(
    r => !rectanglesWithData.has(r.rectangle_code)
  ) || [];

  if (rectanglesWithoutData.length > 0) {
    console.log(`\n⚠️  Rectangles WITHOUT data: ${rectanglesWithoutData.length}\n`);
    
    // Group by region
    const byRegion = new Map<string, any[]>();
    for (const rect of rectanglesWithoutData) {
      const region = rect.cmems_region || 'unknown';
      if (!byRegion.has(region)) {
        byRegion.set(region, []);
      }
      byRegion.get(region)!.push(rect);
    }

    console.log('   By Region:');
    for (const [region, rects] of byRegion.entries()) {
      console.log(`   - ${region}: ${rects.length} rectangles`);
    }

    // Show first 10 missing rectangles
    console.log('\n   First 10 missing rectangles:');
    rectanglesWithoutData.slice(0, 10).forEach(r => {
      console.log(`   - ${r.rectangle_code} (${r.cmems_region}, ${r.distance_to_shore_km}km from shore)`);
    });
  } else {
    console.log('\n✅ ALL rectangles have snapshot data!');
  }

  // Check data freshness
  const { data: latestSnaps } = await supabase
    .from('findr_conditions_snapshots')
    .select('snapshot_time')
    .order('snapshot_time', { ascending: false })
    .limit(1);

  if (latestSnaps && latestSnaps.length > 0) {
    const latest = new Date(latestSnaps[0].snapshot_time);
    const hoursSinceUpdate = (Date.now() - latest.getTime()) / (1000 * 60 * 60);
    
    console.log(`\n⏰ Latest snapshot: ${latest.toISOString()}`);
    console.log(`   (${Math.round(hoursSinceUpdate)} hours ago)`);
  }

  // Analyze data completeness
  console.log('\n\n📊 Data Completeness Analysis:\n');
  
  const { data: sampleSnaps } = await supabase
    .from('findr_conditions_snapshots')
    .select('rectangle_code, data')
    .limit(100);

  if (sampleSnaps && sampleSnaps.length > 0) {
    let hasTemp = 0, hasWaves = 0, hasCurrents = 0, hasClarity = 0, hasNutrients = 0;
    
    for (const snap of sampleSnaps) {
      const data = snap.data as any;
      if (data?.temperatureSurface != null) hasTemp++;
      if (data?.waveHeight != null) hasWaves++;
      if (data?.currentSpeed != null || data?.currentVelocity != null) hasCurrents++;
      if (data?.clarity != null || data?.turbidity != null) hasClarity++;
      if (data?.nutrients != null || data?.chlorophyll != null) hasNutrients++;
    }

    console.log(`   Sample of ${sampleSnaps.length} snapshots:`);
    console.log(`   - Temperature: ${Math.round(hasTemp/sampleSnaps.length*100)}%`);
    console.log(`   - Wave data: ${Math.round(hasWaves/sampleSnaps.length*100)}%`);
    console.log(`   - Currents: ${Math.round(hasCurrents/sampleSnaps.length*100)}%`);
    console.log(`   - Water clarity: ${Math.round(hasClarity/sampleSnaps.length*100)}%`);
    console.log(`   - Nutrients: ${Math.round(hasNutrients/sampleSnaps.length*100)}%`);
  }

  console.log('\n');
}

main().catch(console.error);
