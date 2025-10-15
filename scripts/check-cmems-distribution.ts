#!/usr/bin/env tsx

/**
 * Check CMEMS Region Distribution
 * 
 * Displays how ICES rectangles are distributed across Copernicus Marine (CMEMS) regions
 * and helps identify potential data availability issues.
 * 
 * Usage:
 *   npx tsx scripts/check-cmems-distribution.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const REGION_NAMES: Record<string, string> = {
  'BAL': 'Baltic Sea',
  'MED': 'Mediterranean Sea',
  'BLK': 'Black Sea',
  'IBI': 'Iberia-Biscay-Ireland',
  'NWS': 'Northwest European Shelf',
  'ARC': 'Arctic',
  'GLO': 'Global Ocean',
};

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              CMEMS Region Distribution Analysis                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Fetch all rectangles with their CMEMS regions
  const { data: rectangles, error } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, center_lat, center_lon, cmems_region, distance_to_shore_km, is_coastal');

  if (error || !rectangles) {
    console.error('❌ Failed to fetch rectangles:', error);
    process.exit(1);
  }

  // Group by CMEMS region
  const byRegion = new Map<string, any[]>();
  let withoutRegion = 0;

  for (const rect of rectangles) {
    if (!rect.cmems_region) {
      withoutRegion++;
      continue;
    }
    
    if (!byRegion.has(rect.cmems_region)) {
      byRegion.set(rect.cmems_region, []);
    }
    byRegion.get(rect.cmems_region)!.push(rect);
  }

  console.log('📊 Overall Statistics:');
  console.log(`   Total rectangles: ${rectangles.length}`);
  console.log(`   With CMEMS region: ${rectangles.length - withoutRegion}`);
  if (withoutRegion > 0) {
    console.log(`   ⚠️  Without CMEMS region: ${withoutRegion}`);
  }
  console.log();

  // Display by region
  console.log('🗺️  Distribution by CMEMS Region:\n');
  
  const sortedRegions = Array.from(byRegion.entries()).sort((a, b) => b[1].length - a[1].length);
  
  for (const [region, rects] of sortedRegions) {
    const total = rects.length;
    const coastal = rects.filter(r => r.is_coastal).length;
    const offshore = total - coastal;
    const pct = ((total / rectangles.length) * 100).toFixed(1);
    
    // Calculate geographic bounds
    const lats = rects.map(r => r.center_lat);
    const lons = rects.map(r => r.center_lon);
    const minLat = Math.min(...lats).toFixed(1);
    const maxLat = Math.max(...lats).toFixed(1);
    const minLon = Math.min(...lons).toFixed(1);
    const maxLon = Math.max(...lons).toFixed(1);
    
    console.log(`╭─ ${region} - ${REGION_NAMES[region] || 'Unknown'} ─────────────────`);
    console.log(`│  📍 Count: ${total} rectangles (${pct}%)`);
    console.log(`│  🌊 Offshore: ${offshore} (>10km from shore) - ✅ High data availability expected`);
    console.log(`│  🏖️  Coastal: ${coastal} (≤10km from shore) - ⚠️  May have limited data`);
    console.log(`│  📐 Bounds: ${minLat}°N to ${maxLat}°N, ${minLon}°E to ${maxLon}°E`);
    
    // Sample rectangles
    const samples = rects.slice(0, 5).map(r => r.rectangle_code).join(', ');
    console.log(`│  📦 Sample: ${samples}${rects.length > 5 ? ', ...' : ''}`);
    console.log(`╰────────────────────────────────────────────────────────────────\n`);
  }

  // Check for potential issues
  console.log('🔍 Potential Issues:\n');
  
  let issuesFound = false;

  // Issue 1: Rectangles without CMEMS region
  if (withoutRegion > 0) {
    console.log(`⚠️  ${withoutRegion} rectangles have no CMEMS region assigned`);
    console.log(`   Action: Run 'npx tsx scripts/populate-cmems-regions.ts'\n`);
    issuesFound = true;
  }

  // Issue 2: High coastal percentage
  for (const [region, rects] of sortedRegions) {
    const coastal = rects.filter(r => r.is_coastal).length;
    const coastalPct = (coastal / rects.length) * 100;
    
    if (coastalPct > 70) {
      console.log(`⚠️  ${region}: ${coastalPct.toFixed(0)}% coastal rectangles`);
      console.log(`   This region may have lower data availability`);
      console.log(`   Consider prioritizing offshore rectangles first\n`);
      issuesFound = true;
    }
  }

  // Issue 3: Empty regions
  const expectedRegions = ['BAL', 'MED', 'IBI', 'NWS'];
  for (const region of expectedRegions) {
    if (!byRegion.has(region)) {
      console.log(`⚠️  No rectangles in ${region} (${REGION_NAMES[region]})`);
      console.log(`   This is unusual - check region mapping logic\n`);
      issuesFound = true;
    }
  }

  if (!issuesFound) {
    console.log('✅ No issues detected - ready for data ingestion!\n');
  }

  // Recommendations
  console.log('💡 Recommendations:\n');
  console.log('1. Start with offshore rectangles (highest success rate)');
  console.log('   Command: Add to ingest script: .filter(r => !r.is_coastal)');
  console.log();
  console.log('2. Test a few rectangles from each region first');
  console.log('   Command: FINDR_CONDITIONS_LIMIT=10 npx tsx scripts/ingest-copernicus-data.ts');
  console.log();
  console.log('3. Use appropriate dataset for each region (automatic in regionRouter)');
  console.log();
  console.log('4. Handle coastal areas separately (may need GLO fallback)');
  console.log();

  // Dataset info
  console.log('📚 Dataset Information:\n');
  const datasets = {
    'BAL': 'cmems_mod_bal_phy_my_0.0167deg_P1D-m (~2km resolution)',
    'MED': 'cmems_mod_med_phy-tem_anfc_4.2km_P1D-m (4.2km resolution)',
    'IBI': 'cmems_mod_ibi_phy_my_0.083deg_P1D-m (~9km resolution)',
    'NWS': 'cmems_mod_nws_phy_my_7km_P1D-m (7km resolution)',
    'ARC': 'cmems_mod_arc_phy_my_0.04deg_P1D-m (~4km resolution)',
    'BLK': 'cmems_mod_blk_phy_my_0.04deg_P1D-m (~4km resolution)',
    'GLO': 'cmems_mod_glo_phy_my_0.083deg_P1D-m (~9km resolution)',
  };

  for (const [region, dataset] of Object.entries(datasets)) {
    if (byRegion.has(region)) {
      console.log(`   ${region}: ${dataset}`);
    }
  }

  console.log('\n📖 For more information, see: COPERNICUS_DATA_INGESTION_GUIDE.md');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
