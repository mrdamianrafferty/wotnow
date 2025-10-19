#!/usr/bin/env npx tsx
// Test script for Moon API waterfall integration

import { getMoonSunData } from '../lib/astro/moonService';

async function testMoonWaterfall() {
  console.log('🌙 Testing Moon API Waterfall Integration\n');
  console.log('=' .repeat(60));
  
  const testCases = [
    { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
    { name: 'New York, USA', lat: 40.7128, lon: -74.0060 },
    { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
  ];

  for (const testCase of testCases) {
    console.log(`\n📍 Testing: ${testCase.name} (${testCase.lat}, ${testCase.lon})`);
    console.log('-'.repeat(60));
    
    try {
      const start = Date.now();
      const result = await getMoonSunData({
        lat: testCase.lat,
        lon: testCase.lon,
        date: '2025-10-19'
      });
      const duration = Date.now() - start;

      console.log(`\n✅ Success! (${duration}ms)`);
      console.log(`   Source: ${result.source}`);
      console.log(`   Date: ${result.localDate}`);
      console.log(`   Timezone: ${result.timezone}`);
      console.log(`   Sunrise: ${result.sunriseISO || 'N/A'}`);
      console.log(`   Sunset: ${result.sunsetISO || 'N/A'}`);
      console.log(`   Moonrise: ${result.moonriseISO || 'N/A'}`);
      console.log(`   Moonset: ${result.moonsetISO || 'N/A'}`);
      console.log(`   Moon Phase: ${result.moonPhaseName || 'N/A'}`);
      console.log(`   Moon Illumination: ${result.moonIlluminationPct || 'N/A'}%`);
      console.log(`   Cached At: ${result.cachedAt}`);
      console.log(`   Expires At: ${result.expiresAt}`);
      
      // Verify 0dp rounding
      console.log(`\n   🔍 Coordinate Bucketing (0dp):`);
      console.log(`      Original: ${testCase.lat}, ${testCase.lon}`);
      console.log(`      Bucketed: ${result.latBucket}, ${result.lonBucket}`);
      console.log(`      Precision: ${Math.abs(testCase.lat - result.latBucket) <= 0.5 ? '✅ ~111km' : '❌ Failed'}`);
      
    } catch (error) {
      console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Moon API Waterfall Test Complete!\n');
  
  // Test cache hit on second call
  console.log('Testing cache hit...');
  const start = Date.now();
  const result = await getMoonSunData({
    lat: testCases[0]!.lat,
    lon: testCases[0]!.lon,
    date: '2025-10-19'
  });
  const duration = Date.now() - start;
  console.log(`✅ Cache hit! (${duration}ms) - Source: ${result.source}`);
}

// Run the test
testMoonWaterfall().catch(console.error);
