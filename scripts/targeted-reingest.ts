#!/usr/bin/env tsx

/**
 * Targeted Re-ingestion Script for Specific Rectangles
 * 
 * Re-ingests biogeochemical data for a specific rectangle (default: 28E5) with:
 * - Retry logic (3 attempts per dataset)
 * - Fallback to previous days (up to 7 days back)
 * - Detailed logging
 * 
 * Usage:
 *   npx tsx scripts/targeted-reingest.ts
 *   npx tsx scripts/targeted-reingest.ts --rectangle=29E5
 *   npx tsx scripts/targeted-reingest.ts --rectangle=28E5 --date=2025-10-16
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getRegionalProducts } from '../lib/copernicus/regionRouterV2';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration
const MAX_RETRIES = 3;
const MAX_DAYS_BACK = 7;
const RETRY_DELAY_MS = 2000;
const MIN_VARIABLES_REQUIRED = 3; // Accept partial data if at least 3/7 variables present
const ENABLE_DETAILED_LOGGING = process.env.DEBUG_INGESTION === 'true';
const FALLBACK_TO_WIDER_MARGIN = true; // Try larger bbox if initial fails

// Reasonable ranges for data validation (filter out fill values)
const VALID_RANGES = {
  temperature: { min: -2, max: 35 },      // °C (ocean surface)
  salinity: { min: 0, max: 45 },          // PSU
  chlorophyll: { min: 0, max: 100 },      // µg/L
  clarity: { min: 0, max: 200 },          // m
  nitrate: { min: 0, max: 50 },           // µmol/L
  phosphate: { min: 0, max: 10 },         // µmol/L
  oxygen: { min: 0, max: 20 }             // mg/L
};

interface Rectangle {
  rectangle_code: string;
  center_lat: number;
  center_lon: number;
  cmems_region: string;
  is_coastal: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch a variable with retry logic and enhanced error diagnostics
 */
async function fetchVariableWithRetry(
  datasetId: string,
  variable: string,
  rectangle: Rectangle,
  date: Date,
  options?: { depth?: { min: number; max: number } }
): Promise<number | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const value = await fetchCopernicusVariable(datasetId, variable, rectangle, date, options);
      if (value !== null) {
        return value;
      }
      if (ENABLE_DETAILED_LOGGING) {
        console.log(`    Attempt ${attempt}: No data returned (may be fill values)`);
      }
    } catch (error) {
      lastError = error as Error;
      if (ENABLE_DETAILED_LOGGING) {
        console.log(`    Attempt ${attempt} error: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (attempt === MAX_RETRIES) {
        console.log(`    ✗ All ${MAX_RETRIES} attempts failed`);
        if (lastError) {
          console.log(`    Last error: ${lastError.message.substring(0, 200)}`);
        }
        return null;
      }
      await sleep(RETRY_DELAY_MS);
    }
  }
  return null;
}

/**
 * Core Copernicus fetch function
 */
async function fetchCopernicusVariable(
  datasetId: string,
  variable: string,
  rectangle: Rectangle,
  date: Date,
  options?: { depth?: { min: number; max: number } }
): Promise<number | null> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmems-reingest-'));
  const outputFile = path.join(tmpDir, 'data.nc');
  
  try {
    const dateStr = date.toISOString().split('T')[0];
    let margin = 0.5; // Start with standard margin
    
    // For coastal rectangles, may need wider margin
    if (rectangle.is_coastal && FALLBACK_TO_WIDER_MARGIN) {
      margin = 0.7; // Wider margin for coastal areas
    }
    
    const minLon = rectangle.center_lon - margin;
    const maxLon = rectangle.center_lon + margin;
    const minLat = rectangle.center_lat - margin;
    const maxLat = rectangle.center_lat + margin;
    
    if (ENABLE_DETAILED_LOGGING) {
      console.log(`    Bbox: [${minLon.toFixed(2)}, ${minLat.toFixed(2)}] to [${maxLon.toFixed(2)}, ${maxLat.toFixed(2)}] (margin: ${margin}°)`);
    }
    
    let cmd = `copernicusmarine subset \
      --dataset-id ${datasetId} \
      --variable ${variable} \
      --start-datetime ${dateStr}T00:00:00 \
      --end-datetime ${dateStr}T23:59:59 \
      --minimum-longitude ${minLon} \
      --maximum-longitude ${maxLon} \
      --minimum-latitude ${minLat} \
      --maximum-latitude ${maxLat}`;
    
    if (options?.depth) {
      cmd += ` \
      --minimum-depth ${options.depth.min} \
      --maximum-depth ${options.depth.max}`;
    }
    
    cmd += ` \
      --output-filename ${outputFile} \
      --force-download`;
    
    const cmdOutput = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' });
    
    if (ENABLE_DETAILED_LOGGING && cmdOutput) {
      console.log(`    CLI output: ${cmdOutput.substring(0, 200)}`);
    }
    
    if (!fs.existsSync(outputFile)) {
      if (ENABLE_DETAILED_LOGGING) {
        console.log(`    No output file created at ${outputFile}`);
      }
      return null;
    }
    
    const fileSize = fs.statSync(outputFile).size;
    if (fileSize < 500) {
      if (ENABLE_DETAILED_LOGGING) {
        console.log(`    File too small: ${fileSize} bytes (likely no valid data in bbox)`);
      }
      return null;
    }
    
    const ncdumpCmd = `ncdump -v ${variable} ${outputFile}`;
    const output = execSync(ncdumpCmd, { encoding: 'utf-8' });
    
    const dataMatch = output.match(new RegExp(`${variable}\\s*=\\s*([^;]+);`, 's'));
    if (!dataMatch) {
      return null;
    }
    
    const dataStr = dataMatch[1].trim();
    const values = dataStr
      .replace(/_/g, ' NaN ')
      .split(/[\s,]+/)
      .map(v => parseFloat(v.trim()))
      .filter(v => !isNaN(v) && isFinite(v) && Math.abs(v) < 1e10); // Better fill value filter
    
    if (values.length === 0) {
      return null;
    }
    
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    // Return null if average is still unreasonable (likely fill values)
    if (!isFinite(average) || Math.abs(average) > 1e6) {
      if (ENABLE_DETAILED_LOGGING) {
        console.log(`    Value out of range: ${average} (likely fill value)`);
      }
      return null;
    }
    
    return average;
    
  } finally {
    try {
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      fs.rmdirSync(tmpDir);
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Fetch all biogeochemical variables for a date
 */
async function fetchDataForDate(rectangle: Rectangle, date: Date): Promise<any> {
  const dateStr = date.toISOString().split('T')[0];
  console.log(`\n📅 Fetching data for ${dateStr}...`);
  console.log(`   Rectangle: ${rectangle.rectangle_code} (${rectangle.center_lat.toFixed(2)}°N, ${rectangle.center_lon.toFixed(2)}°E)`);
  console.log(`   Region: ${rectangle.cmems_region}\n`);
  
  const results: any = {
    rectangle_code: rectangle.rectangle_code,
    captured_at: date,
    source: 'copernicus_targeted_reingest'
  };
  
  // Chlorophyll
  console.log('  📊 Chlorophyll...');
  const chlProducts = getRegionalProducts(rectangle.cmems_region, 'chlorophyll');
  for (const product of chlProducts) {
    const variable = product.quality === 'satellite' ? 'CHL' : 'chl';
    const value = await fetchVariableWithRetry(product.datasetId, variable, rectangle, date);
    if (value !== null) {
      results.chlorophyll_mg_m3 = value;
      console.log(`    ✓ ${value.toFixed(3)} mg/m³`);
      break;
    }
  }
  
  // Water clarity
  console.log('  📊 Water clarity...');
  const clarityProducts = getRegionalProducts(rectangle.cmems_region, 'clarity');
  for (const product of clarityProducts) {
    const kd = await fetchVariableWithRetry(product.datasetId, 'KD490', rectangle, date);
    if (kd !== null && kd > 0) {
      const clarity = 1.7 / kd; // Convert KD490 to Secchi depth
      if (clarity >= VALID_RANGES.clarity.min && clarity <= VALID_RANGES.clarity.max) {
        results.clarity_m = clarity;
        console.log(`    ✓ ${clarity.toFixed(2)} m (from KD490: ${kd.toFixed(4)} m⁻¹)`);
        break;
      } else {
        console.log(`    ✗ ${clarity.toFixed(2)} m (out of valid range ${VALID_RANGES.clarity.min}-${VALID_RANGES.clarity.max})`);
      }
    } else if (kd !== null) {
      console.log(`    ✗ KD490: ${kd.toFixed(4)} m⁻¹ (invalid value)`);
    }
  }
  
  // Temperature & Salinity
  console.log('  📊 Temperature & Salinity...');
  const tempProducts = getRegionalProducts(rectangle.cmems_region, 'temperature');
  const salinityProducts = getRegionalProducts(rectangle.cmems_region, 'salinity');
  
  for (const product of tempProducts) {
    if (product.variables.includes('thetao') && !results.sea_temperature_c) {
      const temp = await fetchVariableWithRetry(
        product.datasetId, 
        'thetao', 
        rectangle, 
        date, 
        { depth: { min: 0, max: 10 } }
      );
      if (temp !== null && temp >= VALID_RANGES.temperature.min && temp <= VALID_RANGES.temperature.max) {
        results.sea_temperature_c = temp;
        console.log(`    ✓ Temperature: ${temp.toFixed(2)}°C`);
      } else if (temp !== null) {
        console.log(`    ✗ Temperature: ${temp.toFixed(2)}°C (out of valid range ${VALID_RANGES.temperature.min}-${VALID_RANGES.temperature.max}°C)`);
      }
    }
  }
  
  for (const product of salinityProducts) {
    if (product.variables.includes('so') && !results.salinity_psu) {
      const sal = await fetchVariableWithRetry(
        product.datasetId, 
        'so', 
        rectangle, 
        date, 
        { depth: { min: 0, max: 10 } }
      );
      if (sal !== null && sal >= VALID_RANGES.salinity.min && sal <= VALID_RANGES.salinity.max) {
        results.salinity_psu = sal;
        console.log(`    ✓ Salinity: ${sal.toFixed(2)} PSU`);
      } else if (sal !== null) {
        console.log(`    ✗ Salinity: ${sal.toFixed(2)} PSU (out of valid range ${VALID_RANGES.salinity.min}-${VALID_RANGES.salinity.max})`);
      }
    }
  }
  
  // Nutrients
  console.log('  📊 Nutrients...');
  const nutrientProducts = getRegionalProducts(rectangle.cmems_region, 'nitrate');
  for (const product of nutrientProducts) {
    if (product.variables.includes('no3') && !results.nitrate_umol_l) {
      const no3 = await fetchVariableWithRetry(
        product.datasetId, 
        'no3', 
        rectangle, 
        date, 
        { depth: { min: 0, max: 10 } }
      );
      if (no3 !== null && no3 >= VALID_RANGES.nitrate.min && no3 <= VALID_RANGES.nitrate.max) {
        results.nitrate_umol_l = no3;
        console.log(`    ✓ Nitrate: ${no3.toFixed(3)} µmol/L`);
      } else if (no3 !== null) {
        console.log(`    ✗ Nitrate: ${no3.toFixed(3)} µmol/L (out of valid range ${VALID_RANGES.nitrate.min}-${VALID_RANGES.nitrate.max})`);
      }
    }
    
    if (product.variables.includes('po4') && !results.phosphate_umol_l) {
      const po4 = await fetchVariableWithRetry(
        product.datasetId, 
        'po4', 
        rectangle, 
        date, 
        { depth: { min: 0, max: 10 } }
      );
      if (po4 !== null && po4 >= VALID_RANGES.phosphate.min && po4 <= VALID_RANGES.phosphate.max) {
        results.phosphate_umol_l = po4;
        console.log(`    ✓ Phosphate: ${po4.toFixed(3)} µmol/L`);
      } else if (po4 !== null) {
        console.log(`    ✗ Phosphate: ${po4.toFixed(3)} µmol/L (out of valid range ${VALID_RANGES.phosphate.min}-${VALID_RANGES.phosphate.max})`);
      }
    }
    
    if (results.nitrate_umol_l && results.phosphate_umol_l) break;
  }
  
  // Oxygen
  console.log('  📊 Dissolved oxygen...');
  const oxygenProducts = getRegionalProducts(rectangle.cmems_region, 'oxygen');
  for (const product of oxygenProducts) {
    if (product.variables.includes('o2')) {
      const o2 = await fetchVariableWithRetry(
        product.datasetId, 
        'o2', 
        rectangle, 
        date, 
        { depth: { min: 0, max: 10 } }
      );
      if (o2 !== null) {
        const oxygen = o2 * 0.032; // mmol/m³ to mg/L
        if (oxygen >= VALID_RANGES.oxygen.min && oxygen <= VALID_RANGES.oxygen.max) {
          results.dissolved_oxygen_mg_l = oxygen;
          console.log(`    ✓ ${oxygen.toFixed(2)} mg/L`);
          break;
        } else {
          console.log(`    ✗ ${oxygen.toFixed(2)} mg/L (out of valid range ${VALID_RANGES.oxygen.min}-${VALID_RANGES.oxygen.max})`);
        }
      }
    }
  }
  
  // Count successful fetches
  const dataCount = Object.keys(results).filter(k => 
    k !== 'rectangle_code' && k !== 'captured_at' && k !== 'source' && results[k] !== undefined
  ).length;
  
  // Log summary with variable breakdown
  console.log(`\n  📊 Data Retrieval Summary:`);
  console.log(`  ✅ Temperature:  ${results.sea_temperature_c !== undefined ? '✓' : '✗'}`);
  console.log(`  ✅ Salinity:     ${results.salinity_psu !== undefined ? '✓' : '✗'}`);
  console.log(`  ✅ Chlorophyll:  ${results.chlorophyll_ug_l !== undefined ? '✓' : '✗'}`);
  console.log(`  ✅ Clarity:      ${results.clarity_m !== undefined ? '✓' : '✗'}`);
  console.log(`  ✅ Nitrate:      ${results.nitrate_umol_l !== undefined ? '✓' : '✗'}`);
  console.log(`  ✅ Phosphate:    ${results.phosphate_umol_l !== undefined ? '✓' : '✗'}`);
  console.log(`  ✅ Oxygen:       ${results.dissolved_oxygen_mg_l !== undefined ? '✓' : '✗'}`);
  console.log(`\n  📈 Retrieved ${dataCount}/7 variables (minimum ${MIN_VARIABLES_REQUIRED} required)`);
  
  if (dataCount >= MIN_VARIABLES_REQUIRED) {
    console.log(`  ✅ Threshold met - accepting partial data`);
    return results;
  } else if (dataCount > 0) {
    console.log(`  ⚠️  Only ${dataCount} variables available - below minimum threshold`);
    return null;
  } else {
    console.log(`  ❌ No data available`);
    return null;
  }
}

/**
 * Store data in database
 */
async function storeData(data: any): Promise<void> {
  const { error } = await supabase
    .from('findr_conditions_snapshots')
    .insert(data);
  
  if (error) {
    throw new Error(`Failed to store data: ${error.message}`);
  }
  console.log('  ✅ Data stored in database');
}

/**
 * Main function
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Targeted Rectangle Re-ingestion with Retry Logic        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  // Parse args
  const args = process.argv.slice(2);
  const rectangleArg = args.find(arg => arg.startsWith('--rectangle='));
  const dateArg = args.find(arg => arg.startsWith('--date='));
  
  const rectangleCode = rectangleArg ? rectangleArg.split('=')[1] : '28E5';
  const targetDate = dateArg ? dateArg.split('=')[1] : undefined;
  
  // Fetch rectangle
  console.log(`📍 Fetching rectangle ${rectangleCode}...`);
  const { data: rectangles, error } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, cmems_region, is_coastal')
    .eq('rectangle_code', rectangleCode);
  
  if (error || !rectangles || rectangles.length === 0) {
    throw new Error(`Rectangle ${rectangleCode} not found`);
  }
  
  const rectangle = rectangles[0] as Rectangle;
  console.log(`✅ Found: ${rectangle.center_lat.toFixed(2)}°N, ${rectangle.center_lon.toFixed(2)}°E (${rectangle.cmems_region})\n`);
  
  // Determine start date
  let startDate: Date;
  if (targetDate) {
    startDate = new Date(targetDate);
    console.log(`📅 Using specified date: ${targetDate}`);
  } else {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    console.log(`📅 Using yesterday: ${startDate.toISOString().split('T')[0]}`);
  }
  
  // Try each day going back
  for (let daysBack = 0; daysBack < MAX_DAYS_BACK; daysBack++) {
    const attemptDate = new Date(startDate);
    attemptDate.setDate(attemptDate.getDate() - daysBack);
    
    const data = await fetchDataForDate(rectangle, attemptDate);
    
    if (data) {
      console.log(`\n💾 Storing data...`);
      await storeData(data);
      
      // Count stored variables
      const storedCount = Object.keys(data).filter(k => 
        k !== 'rectangle_code' && k !== 'captured_at' && k !== 'source' && data[k] !== undefined
      ).length;
      
      console.log('\n╔══════════════════════════════════════════════════════════════════╗');
      console.log('║                    INGESTION SUCCESSFUL                          ║');
      console.log('╚══════════════════════════════════════════════════════════════════╝\n');
      console.log(`✅ Successfully ingested ${rectangleCode}`);
      console.log(`   Date: ${attemptDate.toISOString().split('T')[0]}`);
      console.log(`   Days back: ${daysBack}`);
      console.log(`   Variables stored: ${storedCount}/7`);
      
      if (storedCount < 7) {
        console.log(`\n   ℹ️  Note: Partial data accepted (${storedCount}/7 variables)`);
        console.log(`      This is normal for:`);
        console.log(`      • Satellite data lag (chlorophyll, clarity: 5-14 day delay)`);
        console.log(`      • Model data more current (temperature, salinity: 1-2 day delay)`);
      }
      
      console.log();
      return;
    }
    
    if (daysBack < MAX_DAYS_BACK - 1) {
      console.log(`\n⏭️  No data available, trying previous day...\n`);
    }
  }
  
  // All attempts failed
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                      INGESTION FAILED                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log(`❌ Failed to ingest ${rectangleCode} after ${MAX_DAYS_BACK} days of attempts`);
  process.exit(1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
