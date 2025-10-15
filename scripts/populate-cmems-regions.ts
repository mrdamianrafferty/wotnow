#!/usr/bin/env tsx

/**
 * Populate CMEMS Region Mapping for ICES Rectangles
 * 
 * Maps each ICES rectangle to its appropriate Copernicus Marine (CMEMS) regional model
 * based on geographic location and regional naming.
 * 
 * CMEMS Regions:
 * - BAL: Baltic Sea
 * - MED: Mediterranean Sea  
 * - BLK: Black Sea
 * - IBI: Iberia-Biscay-Ireland
 * - NWS: Northwest European Shelf (North Sea, English Channel, Scottish waters)
 * - ARC: Arctic
 * - GLO: Global Ocean (fallback for areas without regional models)
 * 
 * Usage:
 *   npx tsx scripts/populate-cmems-regions.ts
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
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Rectangle {
  rectangle_code: string;
  region: string;
  center_lat: number;
  center_lon: number;
}

/**
 * Determine CMEMS region code based on ICES region name and coordinates
 */
function getCmemsRegion(region: string, lat: number, lon: number): string {
  const regionLower = region.toLowerCase();
  
  // Baltic Sea
  if (
    regionLower.includes('finnish') ||
    regionLower.includes('swedish baltic') ||
    regionLower.includes('polish baltic') ||
    regionLower.includes('danish baltic') ||
    regionLower.includes('baltic')
  ) {
    return 'BAL';
  }
  
  // Mediterranean Sea
  if (
    regionLower.includes('mediterranean') ||
    regionLower.includes('adriatic') ||
    regionLower.includes('italian') ||
    regionLower.includes('greek') ||
    regionLower.includes('turkish mediterranean') ||
    regionLower.includes('croatian') ||
    regionLower.includes('albanian') ||
    regionLower.includes('slovenian') ||
    regionLower.includes('montenegrin') ||
    regionLower.includes('french mediterranean') ||
    regionLower.includes('malta') ||
    regionLower.includes('cyprus') ||
    regionLower.includes('sicily') ||
    regionLower.includes('sardinia') ||
    regionLower.includes('corsica') ||
    regionLower.includes('mallorca') ||
    regionLower.includes('menorca') ||
    regionLower.includes('ibiza') ||
    regionLower.includes('crete') ||
    regionLower.includes('rhodes') ||
    regionLower.includes('ionian') ||
    regionLower.includes('aegean')
  ) {
    return 'MED';
  }
  
  // Black Sea
  if (
    regionLower.includes('black sea') ||
    regionLower.includes('bulgarian') ||
    regionLower.includes('romanian') ||
    regionLower.includes('turkish black') ||
    regionLower.includes('ukrainian') ||
    regionLower.includes('georgian') ||
    regionLower.includes('crimea')
  ) {
    return 'BLK';
  }
  
  // Iberia-Biscay-Ireland (IBI)
  if (
    regionLower.includes('portuguese') ||
    regionLower.includes('galician') ||
    regionLower.includes('bay of biscay') ||
    regionLower.includes('biscay') ||
    regionLower.includes('irish') ||
    regionLower.includes('ireland') ||
    regionLower.includes('celtic sea') ||
    regionLower.includes('cornwall') ||
    regionLower.includes('devon') ||
    regionLower.includes('bristol channel') ||
    regionLower.includes('pembrokeshire') ||
    regionLower.includes('cardigan') ||
    regionLower.includes('anglesey') ||
    regionLower.includes('wales') ||
    regionLower.includes('merseyside') ||
    regionLower.includes('lancashire') ||
    regionLower.includes('cumbria') ||
    regionLower.includes('hebrides') ||
    regionLower.includes('west of scotland')
  ) {
    return 'IBI';
  }
  
  // Northwest European Shelf (NWS) - North Sea, English Channel, Scottish waters
  if (
    regionLower.includes('north sea') ||
    regionLower.includes('english channel') ||
    regionLower.includes('channel') ||
    regionLower.includes('dutch') ||
    regionLower.includes('danish') ||
    regionLower.includes('norwegian') ||
    regionLower.includes('scottish') ||
    regionLower.includes('shetland') ||
    regionLower.includes('orkney') ||
    regionLower.includes('dogger') ||
    regionLower.includes('yorkshire') ||
    regionLower.includes('durham') ||
    regionLower.includes('northumberland') ||
    regionLower.includes('lincolnshire') ||
    regionLower.includes('norfolk') ||
    regionLower.includes('suffolk') ||
    regionLower.includes('essex') ||
    regionLower.includes('kent') ||
    regionLower.includes('sussex') ||
    regionLower.includes('hampshire') ||
    regionLower.includes('dorset') ||
    regionLower.includes('thames') ||
    regionLower.includes('belgian') ||
    regionLower.includes('german bight')
  ) {
    return 'NWS';
  }
  
  // Arctic (Norwegian Arctic, Barents Sea, Svalbard)
  if (
    regionLower.includes('arctic') ||
    regionLower.includes('svalbard') ||
    regionLower.includes('barents') ||
    regionLower.includes('greenland') ||
    lat > 66  // Above Arctic Circle
  ) {
    return 'ARC';
  }
  
  // Geographic bounds for additional coverage
  // Mediterranean: 30-46°N, 6°W-36°E
  if (lat >= 30 && lat <= 46 && lon >= -6 && lon <= 36) {
    return 'MED';
  }
  
  // Baltic: 53-66°N, 10-30°E
  if (lat >= 53 && lat <= 66 && lon >= 10 && lon <= 30) {
    return 'BAL';
  }
  
  // North Sea / NWS: 48-63°N, 12°W-13°E
  if (lat >= 48 && lat <= 63 && lon >= -12 && lon <= 13) {
    return 'NWS';
  }
  
  // IBI: 36-54°N, 20°W-5°W
  if (lat >= 36 && lat <= 54 && lon >= -20 && lon <= -5) {
    return 'IBI';
  }
  
  // Fallback to Global Ocean model
  return 'GLO';
}

/**
 * Main execution
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║            CMEMS Region Mapping for ICES Rectangles             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  // Step 1: Check if cmems_region column exists
  console.log('📋 Step 1: Checking database schema...');
  const { data: columns, error: schemaError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ices_rectangles' 
      AND column_name = 'cmems_region'
    `
  }) as any;
  
  let columnExists = false;
  
  // Try alternative method if RPC doesn't work
  try {
    const { data: testData } = await supabase
      .from('ices_rectangles')
      .select('cmems_region')
      .limit(1);
    columnExists = true;
    console.log('   ✅ cmems_region column exists\n');
  } catch (e) {
    console.log('   ⚠️  cmems_region column does not exist');
    console.log('   📝 Creating column...\n');
    
    // Create the column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE ices_rectangles 
        ADD COLUMN IF NOT EXISTS cmems_region VARCHAR(10);
        
        COMMENT ON COLUMN ices_rectangles.cmems_region IS 
        'Copernicus Marine (CMEMS) regional model code: BAL (Baltic), MED (Mediterranean), BLK (Black Sea), IBI (Iberia-Biscay-Ireland), NWS (Northwest European Shelf), ARC (Arctic), GLO (Global Ocean)';
      `
    }) as any;
    
    if (alterError) {
      console.error('❌ Failed to create column:', alterError);
      process.exit(1);
    }
    
    console.log('   ✅ Column created successfully\n');
  }
  
  // Step 2: Fetch all rectangles
  console.log('📥 Step 2: Fetching ICES rectangles...');
  const { data: rectangles, error: fetchError } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, center_lat, center_lon')
    .order('rectangle_code');
  
  if (fetchError || !rectangles) {
    console.error('❌ Failed to fetch rectangles:', fetchError);
    process.exit(1);
  }
  
  console.log(`   ✅ Found ${rectangles.length} rectangles\n`);
  
  // Step 3: Map rectangles to CMEMS regions
  console.log('🗺️  Step 3: Mapping rectangles to CMEMS regions...\n');
  
  const regionCounts = new Map<string, number>();
  const updates: Array<{ code: string; region: string; cmems: string }> = [];
  
  for (const rect of rectangles as Rectangle[]) {
    const cmemsRegion = getCmemsRegion(rect.region, rect.center_lat, rect.center_lon);
    updates.push({
      code: rect.rectangle_code,
      region: rect.region,
      cmems: cmemsRegion
    });
    
    regionCounts.set(cmemsRegion, (regionCounts.get(cmemsRegion) || 0) + 1);
  }
  
  // Display mapping summary
  console.log('📊 Regional Distribution:');
  const sortedRegions = Array.from(regionCounts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [region, count] of sortedRegions) {
    const pct = ((count / rectangles.length) * 100).toFixed(1);
    const regionNames: Record<string, string> = {
      'NWS': 'Northwest European Shelf',
      'IBI': 'Iberia-Biscay-Ireland',
      'BAL': 'Baltic Sea',
      'MED': 'Mediterranean Sea',
      'BLK': 'Black Sea',
      'ARC': 'Arctic',
      'GLO': 'Global Ocean'
    };
    console.log(`   ${region.padEnd(4)} - ${regionNames[region].padEnd(30)} ${count.toString().padStart(4)} rectangles (${pct}%)`);
  }
  console.log();
  
  // Step 4: Update database
  console.log('💾 Step 4: Updating database...');
  console.log(`   Processing ${updates.length} rectangles in batches of 100...\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  // Process in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(updates.length / BATCH_SIZE);
    
    console.log(`   📦 Batch ${batchNum}/${totalBatches} (${batch.length} rectangles)...`);
    
    for (const update of batch) {
      const { error } = await supabase
        .from('ices_rectangles')
        .update({ cmems_region: update.cmems })
        .eq('rectangle_code', update.code);
      
      if (error) {
        console.log(`      ❌ ${update.code}: ${error.message}`);
        failCount++;
      } else {
        successCount++;
      }
    }
  }
  
  console.log();
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        MAPPING COMPLETE                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Successfully updated: ${successCount}/${updates.length} rectangles`);
  if (failCount > 0) {
    console.log(`❌ Failed updates: ${failCount}`);
  }
  console.log();
  console.log('📊 Regional Datasets Available:');
  console.log('   BAL: cmems_mod_bal_phy_my_0.0167deg_P1D-m');
  console.log('   MED: cmems_mod_med_phy-tem_anfc_4.2km_P1D-m');
  console.log('   IBI: cmems_mod_ibi_phy_my_0.083deg_P1D-m');
  console.log('   NWS: cmems_mod_nws_phy_my_7km_P1D-m');
  console.log('   ARC: cmems_mod_arc_phy_my_0.04deg_P1D-m');
  console.log('   BLK: cmems_mod_blk_phy_my_0.04deg_P1D-m');
  console.log('   GLO: cmems_mod_glo_phy_my_0.083deg_P1D-m');
  console.log();
  console.log('💡 Next Steps:');
  console.log('   1. Verify mapping: SELECT cmems_region, COUNT(*) FROM ices_rectangles GROUP BY cmems_region ORDER BY COUNT(*) DESC;');
  console.log('   2. Start data ingestion: npx tsx scripts/ingest-copernicus-data.ts');
  console.log('   3. Check progress: npx tsx scripts/verify-database-status.ts');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
