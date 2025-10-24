#!/usr/bin/env tsx
/**
 * Test Copernicus Global dataset access via existing credentials
 *
 * This tests if we can access Global PHY and BGC products
 * using the same credentials that work for IBI regional
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const USERNAME = process.env.COPERNICUS_USERNAME;
const PASSWORD = process.env.COPERNICUS_PASSWORD;

if (!USERNAME || !PASSWORD) {
  console.error('❌ Missing COPERNICUS_USERNAME or COPERNICUS_PASSWORD');
  process.exit(1);
}

console.log('🌊 Testing Copernicus Global Dataset Access\n');
console.log(`Username: ${USERNAME}`);
console.log(`Password: ${PASSWORD.substring(0, 3)}***\n`);

// Test coordinates: California
const lat = 37.5;
const lon = -122.5;
const time = '2025-10-23T12:00:00Z';

const authHeader = 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

// Test datasets
const tests = [
  {
    name: 'IBI Regional (known working)',
    url: `https://nrt.cmems-du.eu/thredds/ncss/IBI_ANALYSISFORECAST_BGC_005_004/cmems_mod_ibi_bgc_anfc_0.027deg-3D_P1D-m.nc?var=thetao&latitude=51.5&longitude=1.5&time=${time}&accept=csv&point=true`,
  },
  {
    name: 'Global PHY (0.083deg)',
    url: `https://nrt.cmems-du.eu/thredds/ncss/cmems_mod_glo_phy_anfc_0.083deg_P1D-m.nc?var=thetao&var=so&latitude=${lat}&longitude=${lon}&time=${time}&accept=csv&point=true&addLatLon=true`,
  },
  {
    name: 'Global PHY Alternative (shorter path)',
    url: `https://nrt.cmems-du.eu/thredds/ncss/GLOBAL_ANALYSISFORECAST_PHY_001_024?var=thetao&var=so&latitude=${lat}&longitude=${lon}&time=${time}&accept=csv&point=true`,
  },
  {
    name: 'Global BGC (0.25deg)',
    url: `https://nrt.cmems-du.eu/thredds/ncss/cmems_mod_glo_bgc_anfc_0.25deg_P1D-m.nc?var=o2&var=chl&latitude=${lat}&longitude=${lon}&time=${time}&accept=csv&point=true&addLatLon=true`,
  },
];

async function testEndpoint(name: string, url: string): Promise<void> {
  console.log(`\n📡 Testing: ${name}`);
  console.log(`   URL: ${url.substring(0, 80)}...`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
      },
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const text = await response.text();
      const lines = text.split('\n').slice(0, 5);
      console.log(`   ✅ SUCCESS! Got data:`);
      lines.forEach(line => console.log(`      ${line}`));
    } else {
      const error = await response.text();
      console.log(`   ❌ FAILED: ${error.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Run all tests
async function runTests() {
  for (const test of tests) {
    await testEndpoint(test.name, test.url);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay between tests
  }

  console.log('\n\n📊 Summary:');
  console.log('If IBI Regional works but Global fails, we need to find correct Global URLs');
  console.log('Check Copernicus Data Store: https://data.marine.copernicus.eu');
}

runTests().catch(console.error);
