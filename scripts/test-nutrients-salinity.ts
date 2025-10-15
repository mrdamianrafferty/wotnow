#!/usr/bin/env tsx
/**
 * Quick test for remaining frontend bio indicators:
 * - Nitrate (NO3)
 * - Phosphate (PO4)
 * - Salinity (SO)
 * 
 * Tests Mediterranean only for speed
 */

import { execSync } from 'child_process';

const testLocation = {
  region: "MED",
  rectangle: "37I0",
  lat: 39.5,
  lon: 2.5,
  date: "2025-10-01"
};

const minLat = testLocation.lat - 0.5;
const maxLat = testLocation.lat + 0.5;
const minLon = testLocation.lon - 0.5;
const maxLon = testLocation.lon + 0.5;

console.log('🧪 Quick Test: Nutrients + Salinity\n');
console.log(`📍 Test Location: ${testLocation.region} - ${testLocation.rectangle}`);
console.log(`   Coordinates: ${testLocation.lat}°N, ${testLocation.lon}°E\n`);

// TEST 1: Nutrients (NO3 + PO4)
console.log('=' .repeat(60));
console.log('🧪 Test 1: Nutrients (Nitrate + Phosphate)');
console.log('='.repeat(60));
console.log('Dataset: cmems_mod_med_bgc-nut_anfc_4.2km_P1D-m');
console.log('Variables: no3, po4\n');

const nutrientFile = '/tmp/test_nutrients_quick.nc';
const nutrientCommand = `copernicusmarine subset \
  --dataset-id cmems_mod_med_bgc-nut_anfc_4.2km_P1D-m \
  --variable no3 --variable po4 \
  --start-datetime ${testLocation.date}T00:00:00 \
  --end-datetime ${testLocation.date}T23:59:59 \
  --minimum-longitude ${minLon} --maximum-longitude ${maxLon} \
  --minimum-latitude ${minLat} --maximum-latitude ${maxLat} \
  --output-filename ${nutrientFile} \
  --force-download`;

try {
  const output = execSync(nutrientCommand, { encoding: 'utf8', timeout: 120000 });
  
  if (output.includes('Successfully downloaded')) {
    console.log('✅ SUCCESS - Nutrients downloaded\n');
    
    try {
      const info = execSync(`ncdump -h ${nutrientFile} 2>&1 | grep -E "(dimensions:|no3|po4)" | head -15`, {
        encoding: 'utf8'
      });
      console.log('📊 Dataset Info:');
      console.log(info);
    } catch (e) {
      console.log('(ncdump not available for details)\n');
    }
  }
} catch (error: any) {
  console.log(`❌ FAILED: ${error.message.split('\n')[0]}\n`);
}

// TEST 2: Salinity
console.log('\n' + '='.repeat(60));
console.log('🌊 Test 2: Salinity');
console.log('='.repeat(60));
console.log('Dataset: cmems_mod_med_phy-sal_anfc_4.2km_P1D-m');
console.log('Variable: so\n');

const salinityFile = '/tmp/test_salinity_quick.nc';
const salinityCommand = `copernicusmarine subset \
  --dataset-id cmems_mod_med_phy-sal_anfc_4.2km_P1D-m \
  --variable so \
  --start-datetime ${testLocation.date}T00:00:00 \
  --end-datetime ${testLocation.date}T23:59:59 \
  --minimum-longitude ${minLon} --maximum-longitude ${maxLon} \
  --minimum-latitude ${minLat} --maximum-latitude ${maxLat} \
  --output-filename ${salinityFile} \
  --force-download`;

try {
  const output = execSync(salinityCommand, { encoding: 'utf8', timeout: 120000 });
  
  if (output.includes('Successfully downloaded')) {
    console.log('✅ SUCCESS - Salinity downloaded\n');
    
    try {
      const info = execSync(`ncdump -h ${salinityFile} 2>&1 | grep -E "(dimensions:|so)" | head -15`, {
        encoding: 'utf8'
      });
      console.log('📊 Dataset Info:');
      console.log(info);
    } catch (e) {
      console.log('(ncdump not available for details)\n');
    }
  }
} catch (error: any) {
  console.log(`❌ FAILED: ${error.message.split('\n')[0]}\n`);
}

console.log('\n' + '='.repeat(60));
console.log('📋 SUMMARY');
console.log('='.repeat(60));
console.log('\n✅ Frontend Bio Indicators Data Sources:');
console.log('   1. Chlorophyll (CHL) - VERIFIED ✅');
console.log('   2. Dissolved Oxygen (o2) - VERIFIED ✅');
console.log('   3. Nitrate (no3) - Testing...');
console.log('   4. Phosphate (po4) - Testing...');
console.log('   5. Salinity (so) - Testing...');
console.log('   6. Water Clarity (KD490) - VERIFIED ✅');
console.log('   7. Water Temperature - LIVE (MET Norway) ✅');
console.log('   8. Phytoplankton - TBD (clarify with frontend)\n');
console.log('💰 Cost: Still $0/month!');
console.log('🎯 Ready to deploy RPC function and unblock frontend!\n');
