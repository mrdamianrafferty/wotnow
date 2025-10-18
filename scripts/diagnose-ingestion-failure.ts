#!/usr/bin/env tsx

/**
 * Diagnostic Script for Copernicus Ingestion Failures
 * 
 * This script helps identify WHY data fetching failed by:
 * 1. Testing Copernicus CLI connectivity
 * 2. Checking dataset availability for the region
 * 3. Testing with a simple known-good query
 * 4. Providing detailed error information
 * 
 * Usage:
 *   npx tsx scripts/diagnose-ingestion-failure.ts --rectangle=28E5
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getRegionalProducts } from '../lib/copernicus/regionRouterV2';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DiagnosticResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: DiagnosticResult[] = [];

function addResult(test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
  results.push({ test, status, message, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${test}: ${message}`);
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

/**
 * Test 1: Check Copernicus CLI is installed and authenticated
 */
async function testCopernicusCLI(): Promise<void> {
  console.log('\n📋 Test 1: Copernicus CLI Authentication\n');
  
  try {
    const version = execSync('copernicusmarine --version', { encoding: 'utf-8' }).trim();
    addResult('CLI Installed', 'PASS', `Version: ${version}`);
  } catch (error) {
    addResult('CLI Installed', 'FAIL', 'Copernicus CLI not found or not in PATH');
    return;
  }
  
  // Check if authenticated (try to list a dataset)
  try {
    execSync('copernicusmarine describe --include-datasets --max-concurrent-requests 1', {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: 'pipe'
    });
    addResult('CLI Authenticated', 'PASS', 'Successfully connected to Copernicus Marine');
  } catch (error) {
    addResult('CLI Authenticated', 'FAIL', 'Authentication failed - run: copernicusmarine login');
  }
}

/**
 * Test 2: Verify rectangle exists and get its details
 */
async function testRectangleExists(rectangleCode: string): Promise<any> {
  console.log('\n📋 Test 2: Rectangle Metadata\n');
  
  const { data, error } = await supabase
    .from('ices_rectangles')
    .select('*')
    .eq('rectangle_code', rectangleCode)
    .single();
  
  if (error || !data) {
    addResult('Rectangle Exists', 'FAIL', `Rectangle ${rectangleCode} not found in database`);
    return null;
  }
  
  addResult('Rectangle Exists', 'PASS', `Found ${rectangleCode}`, {
    lat: data.center_lat,
    lon: data.center_lon,
    region: data.cmems_region,
    coastal: data.is_coastal
  });
  
  return data;
}

/**
 * Test 3: Check if coordinates are on land
 */
async function testCoordinateValidity(lat: number, lon: number): Promise<void> {
  console.log('\n📋 Test 3: Coordinate Validity\n');
  
  // Basic sanity checks
  if (lat < -90 || lat > 90) {
    addResult('Latitude Range', 'FAIL', `Invalid latitude: ${lat}`);
    return;
  }
  addResult('Latitude Range', 'PASS', `Latitude ${lat}° is valid`);
  
  if (lon < -180 || lon > 180) {
    addResult('Longitude Range', 'FAIL', `Invalid longitude: ${lon}`);
    return;
  }
  addResult('Longitude Range', 'PASS', `Longitude ${lon}° is valid`);
  
  // Try a small test fetch to see if location has ocean data
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmems-test-'));
  const outputFile = path.join(tmpDir, 'test.nc');
  
  try {
    const margin = 0.1;
    const cmd = `copernicusmarine subset \
      --dataset-id cmems_mod_glo_phy_anfc_0.083deg_P1D-m \
      --variable zos \
      --start-datetime 2025-10-01T00:00:00 \
      --end-datetime 2025-10-01T00:00:00 \
      --minimum-longitude ${lon - margin} \
      --maximum-longitude ${lon + margin} \
      --minimum-latitude ${lat - margin} \
      --maximum-latitude ${lat + margin} \
      --output-filename ${outputFile} \
      --force-download`;
    
    execSync(cmd, { stdio: 'pipe', timeout: 30000 });
    
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      if (stats.size < 500) {
        addResult('Ocean Data Available', 'WARN', 'Very small file - may be on/near land');
      } else {
        addResult('Ocean Data Available', 'PASS', 'Location has valid ocean data');
      }
    } else {
      addResult('Ocean Data Available', 'FAIL', 'No data file created');
    }
  } catch (error) {
    addResult('Ocean Data Available', 'FAIL', 'Cannot fetch data - likely on land or too close to coast', {
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

/**
 * Test 4: Check if datasets exist for this region
 */
async function testRegionalDatasets(cmemsRegion: string): Promise<void> {
  console.log('\n📋 Test 4: Regional Dataset Availability\n');
  
  const variables = ['chlorophyll', 'clarity', 'temperature', 'nitrate', 'oxygen'] as const;
  
  for (const variable of variables) {
    const products = getRegionalProducts(cmemsRegion, variable);
    
    if (products.length === 0) {
      addResult(`Dataset: ${variable}`, 'FAIL', `No products configured for ${cmemsRegion}`);
    } else {
      addResult(`Dataset: ${variable}`, 'PASS', `${products.length} products available`, {
        primary: products[0].datasetId,
        quality: products[0].quality,
        source: products[0].source
      });
    }
  }
}

/**
 * Test 5: Try fetching a single variable
 */
async function testSingleVariableFetch(
  rectangle: any,
  date: Date
): Promise<void> {
  console.log('\n📋 Test 5: Test Variable Fetch\n');
  
  // Try chlorophyll from satellite (usually most reliable)
  const products = getRegionalProducts(rectangle.cmems_region, 'chlorophyll');
  
  if (products.length === 0) {
    addResult('Variable Fetch', 'FAIL', 'No chlorophyll products available');
    return;
  }
  
  const product = products[0];
  const variable = product.quality === 'satellite' ? 'CHL' : 'chl';
  
  console.log(`Attempting to fetch ${variable} from ${product.datasetId}...`);
  
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmems-test-'));
  const outputFile = path.join(tmpDir, 'test.nc');
  
  try {
    const dateStr = date.toISOString().split('T')[0];
    const margin = 0.5;
    const minLon = rectangle.center_lon - margin;
    const maxLon = rectangle.center_lon + margin;
    const minLat = rectangle.center_lat - margin;
    const maxLat = rectangle.center_lat + margin;
    
    const cmd = `copernicusmarine subset \
      --dataset-id ${product.datasetId} \
      --variable ${variable} \
      --start-datetime ${dateStr}T00:00:00 \
      --end-datetime ${dateStr}T23:59:59 \
      --minimum-longitude ${minLon} \
      --maximum-longitude ${maxLon} \
      --minimum-latitude ${minLat} \
      --maximum-latitude ${maxLat} \
      --output-filename ${outputFile} \
      --force-download`;
    
    console.log(`Command: ${cmd.substring(0, 100)}...`);
    
    const output = execSync(cmd, { 
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 60000
    });
    
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      
      if (stats.size < 500) {
        addResult('Variable Fetch', 'WARN', 'File too small - no valid data', { size: stats.size });
      } else {
        // Try to parse it
        try {
          const ncdumpCmd = `ncdump -v ${variable} ${outputFile}`;
          const ncdumpOutput = execSync(ncdumpCmd, { encoding: 'utf-8' });
          
          const dataMatch = ncdumpOutput.match(new RegExp(`${variable}\\s*=\\s*([^;]+);`, 's'));
          if (dataMatch) {
            const dataStr = dataMatch[1].trim();
            const values = dataStr
              .replace(/_/g, ' NaN ')
              .split(/[\s,]+/)
              .map(v => parseFloat(v.trim()))
              .filter(v => !isNaN(v) && Math.abs(v) < 1e30);
            
            if (values.length === 0) {
              addResult('Variable Fetch', 'WARN', 'File parsed but all values are fill/invalid');
            } else {
              const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
              addResult('Variable Fetch', 'PASS', `Successfully fetched ${variable}`, {
                value: mean.toFixed(3),
                validPoints: values.length
              });
            }
          } else {
            addResult('Variable Fetch', 'WARN', 'Could not parse NetCDF data');
          }
        } catch (parseError) {
          addResult('Variable Fetch', 'WARN', 'File exists but parsing failed', {
            error: parseError instanceof Error ? parseError.message : String(parseError)
          });
        }
      }
    } else {
      addResult('Variable Fetch', 'FAIL', 'No output file created');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // Check for specific error patterns
    if (errorMsg.includes('No data available')) {
      addResult('Variable Fetch', 'WARN', 'Dataset exists but no data for this date/location');
    } else if (errorMsg.includes('Dataset not found')) {
      addResult('Variable Fetch', 'FAIL', 'Dataset ID does not exist');
    } else if (errorMsg.includes('Authentication')) {
      addResult('Variable Fetch', 'FAIL', 'Authentication failed');
    } else {
      addResult('Variable Fetch', 'FAIL', 'Fetch failed', { error: errorMsg });
    }
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

/**
 * Generate fallback recommendations based on test results
 */
function generateRecommendations(): void {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                     RECOMMENDATIONS                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  const failures = results.filter(r => r.status === 'FAIL');
  const warnings = results.filter(r => r.status === 'WARN');
  
  if (failures.length === 0 && warnings.length === 0) {
    console.log('✅ All tests passed! If ingestion still fails, the issue may be:');
    console.log('   • Data not available for the specific date');
    console.log('   • Temporary Copernicus service issue');
    console.log('   • Network connectivity problem');
    console.log('\n💡 Try running targeted-reingest.ts - it should work!');
    return;
  }
  
  // Check for common failure patterns
  const hasAuthFailure = failures.some(r => r.test.includes('Authenticated'));
  const hasDatasetFailure = failures.some(r => r.test.includes('Dataset'));
  const hasLocationFailure = failures.some(r => r.test.includes('Ocean Data'));
  const hasFetchWarning = warnings.some(r => r.test.includes('Variable Fetch'));
  
  if (hasAuthFailure) {
    console.log('🔑 AUTHENTICATION ISSUE DETECTED');
    console.log('   Run: copernicusmarine login');
    console.log('   Then re-run this diagnostic\n');
  }
  
  if (hasLocationFailure) {
    console.log('🗺️  LOCATION ISSUE DETECTED');
    console.log('   Rectangle appears to be on land or too close to coast');
    console.log('   Solutions:');
    console.log('   • Use a different rectangle');
    console.log('   • Adjust margin in fetch function (increase from 0.5° to 0.7°)');
    console.log('   • Try different CMEMS dataset with better coastal coverage\n');
  }
  
  if (hasDatasetFailure) {
    console.log('📊 DATASET CONFIGURATION ISSUE');
    console.log('   Some datasets not configured for this region');
    console.log('   Check: lib/copernicus/regionRouterV2.ts');
    console.log('   May need to add fallback to global datasets\n');
  }
  
  if (hasFetchWarning) {
    console.log('⚠️  DATA AVAILABILITY ISSUE');
    console.log('   Dataset exists but no data for this date/location');
    console.log('   Solutions:');
    console.log('   • Try a different date (--date=2025-10-15)');
    console.log('   • Use date fallback (already built into targeted-reingest.ts)');
    console.log('   • Check Copernicus Marine data catalog for coverage dates\n');
  }
  
  console.log('🔄 AUTOMATIC FALLBACK STRATEGIES:');
  console.log('   1. Date fallback: Try up to 7 days back');
  console.log('   2. Dataset fallback: Try regional → global datasets');
  console.log('   3. Margin adjustment: Increase bbox if coastal');
  console.log('   4. Variable graceful degradation: Continue with partial data\n');
}

/**
 * Main diagnostic function
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         Copernicus Ingestion Failure Diagnostic Tool            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  // Parse args
  const args = process.argv.slice(2);
  const rectangleArg = args.find(arg => arg.startsWith('--rectangle='));
  const dateArg = args.find(arg => arg.startsWith('--date='));
  
  const rectangleCode = rectangleArg ? rectangleArg.split('=')[1] : '28E5';
  const targetDate = dateArg ? new Date(dateArg.split('=')[1]) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  console.log(`Target Rectangle: ${rectangleCode}`);
  console.log(`Target Date: ${targetDate.toISOString().split('T')[0]}\n`);
  
  // Run tests
  await testCopernicusCLI();
  
  const rectangle = await testRectangleExists(rectangleCode);
  if (!rectangle) {
    console.log('\n❌ Cannot continue without valid rectangle');
    process.exit(1);
  }
  
  await testCoordinateValidity(rectangle.center_lat, rectangle.center_lon);
  await testRegionalDatasets(rectangle.cmems_region);
  await testSingleVariableFetch(rectangle, targetDate);
  
  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`📊 Total: ${results.length}\n`);
  
  generateRecommendations();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
