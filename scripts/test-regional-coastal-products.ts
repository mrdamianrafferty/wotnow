#!/usr/bin/env tsx
/**
 * Test Copernicus Regional Coastal Products
 * 
 * Tests coastal rectangles with correct regional product IDs:
 * - 37I0 (Balearic Islands, MED region) - VERIFIED WORKING ✅
 * - 21C6 (Portugal, Atlantic/IBI region) - TO TEST
 * - 22L4 (Baltic proper) - TO TEST
 */

import { execSync } from 'child_process';

interface TestCase {
  region: string;
  rectangle: string;
  lat: number;
  lon: number;
  datasetId: string;
  variable: string;
  date: string;
}

// Test cases for different regions
const testCases: TestCase[] = [
  // MEDITERRANEAN - VERIFIED WORKING ✅
  {
    region: "MED",
    rectangle: "37I0", // Balearic Islands
    lat: 39.5,
    lon: 2.5,
    datasetId: "cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D",
    variable: "CHL",
    date: "2025-10-03", // Within verified range (1997-09-16 to 2025-10-03)
  },
  // ATLANTIC (covers IBI region) - TO TEST
  {
    region: "ATL/IBI",
    rectangle: "21C6", // Portugal coast
    lat: 40.5,
    lon: -9.5,
    datasetId: "cmems_obs-oc_atl_bgc-plankton_my_l4-gapfree-multi-1km_P1D", // Atlantic gap-free chlorophyll
    variable: "CHL",
    date: "2025-10-01",
  },
  // BALTIC - TO TEST
  {
    region: "BAL",
    rectangle: "22L4", // Baltic proper
    lat: 54.5,
    lon: 14.5,
    datasetId: "cmems_obs-oc_bal_bgc-plankton_my_l3-multi-1km_P1D", // Baltic multi-sensor chlorophyll
    variable: "CHL",
    date: "2025-10-01",
  },
];

console.log('🧪 Testing Copernicus Regional Coastal Products\n');
console.log('Testing if regional products work within 30-50km of shore...\n');

for (const test of testCases) {
  console.log(`\n📍 ${test.rectangle} (${test.region} region) @ ${test.lat},${test.lon}`);
  console.log(`   Dataset: ${test.datasetId}`);
  console.log(`   Variable: ${test.variable}`);
  console.log(`   Date: ${test.date}`);
  
  // Build bounding box (±0.5° around center)
  const minLat = test.lat - 0.5;
  const maxLat = test.lat + 0.5;
  const minLon = test.lon - 0.5;
  const maxLon = test.lon + 0.5;
  
  const outputFile = `/tmp/test_${test.rectangle.toLowerCase()}.nc`;
  
  const command = `copernicusmarine subset --dataset-id ${test.datasetId} --variable ${test.variable} --start-datetime ${test.date}T00:00:00 --end-datetime ${test.date}T23:59:59 --minimum-longitude ${minLon} --maximum-longitude ${maxLon} --minimum-latitude ${minLat} --maximum-latitude ${maxLat} --output-filename ${outputFile} --force-download`;
  
  try {
    console.log(`\n⏳ Downloading data...`);
    const output = execSync(command, { 
      encoding: 'utf8',
      timeout: 120000 // 2 minute timeout
    });
    
    // Check if successful
    if (output.includes('Successfully downloaded')) {
      console.log(`✅ SUCCESS: Data downloaded to ${outputFile}`);
      
      // Get dimensions
      try {
        const dims = execSync(`ncdump -h ${outputFile} 2>&1 | grep "dimensions:" -A 3`, {
          encoding: 'utf8'
        });
        console.log(`📊 Dimensions:\n${dims}`);
      } catch (e) {
        // ncdump not available, skip
      }
    } else {
      console.log(`⚠️  Download completed but status unclear`);
    }
    
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    if (error.stderr) {
      console.log(`Error output: ${error.stderr.substring(0, 500)}`);
    }
  }
}

console.log('\n\n=== Summary ===');
console.log(`Tested ${testCases.length} regional products`);
console.log(`✅ MED: cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D (VERIFIED)`);
console.log(`🔄 ATL/IBI: cmems_obs-oc_atl_bgc-plankton_my_l4-gapfree-multi-1km_P1D`);
console.log(`🔄 BAL: cmems_obs-oc_bal_bgc-plankton_my_l3-multi-1km_P1D`);
