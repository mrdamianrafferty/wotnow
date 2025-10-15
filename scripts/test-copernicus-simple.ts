#!/usr/bin/env tsx
/**
 * SIMPLE TEST: Download ONE of each verified bio indicator
 * 
 * Uses exact commands we tested successfully earlier
 * Location: 37I0 (Balearic Islands, Mediterranean)
 * Date: 2025-10-01 (known good date)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import * as NetCDF4 from 'netcdf4';

const execAsync = promisify(exec);

const LOCATION = {
  code: '37I0',
  name: 'Balearic Islands',
  lat: 39.5,
  lon: 2.5,
  minLon: 2.4,
  maxLon: 2.6,
  minLat: 39.4,
  maxLat: 39.6
};

const DATE = '2025-10-01';

console.log(`🧪 Simple Copernicus Test`);
console.log(`📍 Location: ${LOCATION.code} (${LOCATION.name})`);
console.log(`📅 Date: ${DATE}`);
console.log();

async function downloadVariable(
  datasetId: string,
  variable: string,
  outputFile: string,
  hasDepth = false
): Promise<number | null> {
  const depthParams = hasDepth ? `--minimum-depth 0 --maximum-depth 10` : '';
  
  const command = `copernicusmarine subset \\
    --dataset-id ${datasetId} \\
    --variable ${variable} \\
    --start-datetime ${DATE}T00:00:00 \\
    --end-datetime ${DATE}T23:59:59 \\
    --minimum-longitude ${LOCATION.minLon} \\
    --maximum-longitude ${LOCATION.maxLon} \\
    --minimum-latitude ${LOCATION.minLat} \\
    --maximum-latitude ${LOCATION.maxLat} \\
    ${depthParams} \\
    --output-filename ${outputFile}`;

  console.log(`⏳ Downloading ${variable} from ${datasetId}...`);
  
  try {
    await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
    
    // Read the NetCDF file to extract value
    const ncFile = new NetCDF4.File(outputFile, 'r');
    const varData = ncFile.root.variables[variable];
    const values = varData.readSlice(0, varData.dimensions[0].length);
    
    // Get first valid value
    let firstValue: number | null = null;
    for (let i = 0; i < values.length; i++) {
      if (values[i] !== null && !isNaN(values[i]) && isFinite(values[i])) {
        firstValue = values[i];
        break;
      }
    }
    
    ncFile.close();
    
    if (firstValue !== null) {
      console.log(`✅ ${variable}: ${firstValue.toFixed(3)}`);
      return firstValue;
    } else {
      console.log(`⚠️  ${variable}: No valid data`);
      return null;
    }
  } catch (error) {
    console.log(`❌ ${variable}: Failed`);
    console.error(error instanceof Error ? error.message.split('\\n')[0] : 'Unknown error');
    return null;
  }
}

async function main() {
  const results: Record<string, number | null> = {};

  // 1. Chlorophyll (satellite)
  results.chlorophyll = await downloadVariable(
    'cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D',
    'CHL',
    '/tmp/test_chlorophyll.nc'
  );

  // 2. Water Clarity (satellite)
  results.clarity = await downloadVariable(
    'cmems_obs-oc_med_bgc-transp_my_l3-multi-1km_P1D',
    'KD490',
    '/tmp/test_clarity.nc'
  );

  // 3. Dissolved Oxygen (model, with depth)
  results.oxygen = await downloadVariable(
    'cmems_mod_med_bgc-bio_anfc_4.2km_P1D-m',
    'o2',
    '/tmp/test_oxygen.nc',
    true
  );

  // 4. Nitrate (model, with depth)
  results.nitrate = await downloadVariable(
    'cmems_mod_med_bgc-nut_anfc_4.2km_P1D-m',
    'no3',
    '/tmp/test_nitrate.nc',
    true
  );

  // 5. Phosphate (model, with depth)
  results.phosphate = await downloadVariable(
    'cmems_mod_med_bgc-nut_anfc_4.2km_P1D-m',
    'po4',
    '/tmp/test_phosphate.nc',
    true
  );

  // 6. Salinity (model, with depth)
  results.salinity = await downloadVariable(
    'cmems_mod_med_phy-sal_anfc_4.2km_P1D-m',
    'so',
    '/tmp/test_salinity.nc',
    true
  );

  console.log();
  console.log('📊 RESULTS SUMMARY:');
  console.log('═'.repeat(50));
  
  const successCount = Object.values(results).filter(v => v !== null).length;
  const totalCount = Object.keys(results).length;
  
  Object.entries(results).forEach(([key, value]) => {
    const status = value !== null ? '✅' : '❌';
    const display = value !== null ? value.toFixed(3) : 'FAILED';
    console.log(`${status} ${key.padEnd(15)}: ${display}`);
  });
  
  console.log('═'.repeat(50));
  console.log(`Success Rate: ${successCount}/${totalCount} (${(successCount/totalCount*100).toFixed(0)}%)`);
  console.log();
  
  if (successCount === totalCount) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Ready to integrate into full ingestion script');
  } else {
    console.log('⚠️  Some tests failed - check dataset IDs and variable names');
  }
}

main().catch(console.error);
