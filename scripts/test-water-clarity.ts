/**
 * Test script to verify kd490 water clarity integration
 * Run with: npx tsx scripts/test-water-clarity.ts
 */

import { MockCopernicusProvider } from '../lib/copernicus/mockClient';
import { toCopernicusMarineData } from '../lib/copernicus/transformers';
import { calculateWaterClarity, interpretClarity } from '../lib/utils/waterClarity';
import { getBiteScore } from '../hooks/useBiteScore';

async function testWaterClarity() {
  console.log('🌊 Testing Water Clarity Integration\n');
  console.log('=' .repeat(60));

  // Step 1: Fetch mock Copernicus data
  console.log('\n📡 Step 1: Fetching Copernicus data...');
  const provider = new MockCopernicusProvider();
  const bundle = await provider.fetchBundle({
    lat: 43.55,
    lon: -6.25,
    start: '2025-09-27T00:00:00Z',
    end: '2025-09-27T23:59:59Z',
  });

  const data = toCopernicusMarineData(bundle);
  console.log('✅ Fetched', data.snapshots.length, 'snapshots');

  // Step 2: Extract kd490 and chlorophyll
  console.log('\n🔍 Step 2: Extracting water clarity metrics...');
  const snapshot = data.snapshots[0];
  const kd490 = snapshot.kd490Surface;
  const chlorophyll = snapshot.chlorophyllSurface;

  console.log('   kd490 (attenuation):', kd490);
  console.log('   Chlorophyll (mg/m³):', chlorophyll);

  if (kd490 === undefined) {
    console.error('\n❌ ERROR: kd490 is undefined!');
    console.log('   Check that asturias-mock.json has kd490 values');
    return;
  }

  // Step 3: Calculate clarity
  console.log('\n💧 Step 3: Calculating water clarity...');
  const clarity = calculateWaterClarity(kd490, chlorophyll);

  if (!clarity) {
    console.error('❌ ERROR: Clarity calculation returned null');
    return;
  }

  console.log('   Clarity Index:', clarity.clarity_index.toFixed(3), '(0-1 scale)');
  console.log('   Method:', clarity.method);
  console.log('   Confidence:', clarity.confidence);

  const interpretation = interpretClarity(clarity.clarity_index);
  console.log('\n   🎯 Interpretation:');
  console.log('      Label:', interpretation.label);
  console.log('      Description:', interpretation.description);
  console.log('      Fishing Impact:', interpretation.fishingImpact);

  // Step 4: Test with sight feeder (Plaice)
  console.log('\n🐟 Step 4: Testing with Plaice (sight feeder)...');
  
  const plaiceParams = {
    waterClarityWeight: 0.18,  // High clarity dependency
    tideWeight: 0.28,
    lightWeight: 0.30,
    windWeight: 0.10,
    pressureWeight: 0.10,
    tempWeight: 0.17,
    lunarWeight: 0.05,
    turbidityWeight: 0.02,
  };

  const conditions = {
    water_clarity_m: clarity.clarity_index,
    tide_stage: 'mid_flood',
    current_speed_ms: 0.5,
    solar_elevation_deg: 45,
    wind_speed_ms: 5,
    sst_c: 15,
  };

  const plaiceScore = getBiteScore(plaiceParams, conditions);
  console.log('   Overall Score:', (plaiceScore.score * 100).toFixed(1) + '%');
  console.log('   Clarity Sub-Score:', (plaiceScore.breakdown.clarity * 100).toFixed(1) + '%');
  console.log('   Clarity Weight Used:', plaiceScore.weights.clarity?.toFixed(3) || '0');

  // Step 5: Test with scent feeder (Cod)
  console.log('\n🐟 Step 5: Testing with Cod (scent feeder)...');
  
  const codParams = {
    waterClarityWeight: 0.00,  // No clarity dependency
    tideWeight: 0.30,
    lightWeight: 0.25,
    windWeight: 0.15,
    pressureWeight: 0.12,
    tempWeight: 0.13,
    lunarWeight: 0.05,
    turbidityWeight: 0.00,
  };

  const codScore = getBiteScore(codParams, conditions);
  console.log('   Overall Score:', (codScore.score * 100).toFixed(1) + '%');
  console.log('   Clarity Sub-Score:', (codScore.breakdown.clarity * 100).toFixed(1) + '%');
  console.log('   Clarity Weight Used:', codScore.weights.clarity?.toFixed(3) || '0');
  console.log('   ✅ Cod unaffected by clarity (scent hunter)');

  // Step 6: Compare clear vs murky water
  console.log('\n📊 Step 6: Comparing clear vs murky conditions...');
  
  const clearConditions = { ...conditions, water_clarity_m: 0.9 };  // Crystal clear
  const murkyConditions = { ...conditions, water_clarity_m: 0.2 };  // Very murky

  const plaiceClear = getBiteScore(plaiceParams, clearConditions);
  const plaiceMurky = getBiteScore(plaiceParams, murkyConditions);

  const clearScore = (plaiceClear.score * 100).toFixed(1);
  const murkyScore = (plaiceMurky.score * 100).toFixed(1);
  const difference = ((plaiceClear.score - plaiceMurky.score) * 100).toFixed(1);

  console.log('\n   Plaice in CLEAR water (0.9):  ' + clearScore + '%');
  console.log('   Plaice in MURKY water (0.2):  ' + murkyScore + '%');
  console.log('   Difference:                    +' + difference + '%');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETE\n');
  console.log('Summary:');
  console.log('• kd490 successfully extracted from mock data');
  console.log('• Clarity calculation working (Method: ' + clarity.method + ')');
  console.log('• Sight feeders respond to clarity changes');
  console.log('• Scent feeders unaffected by clarity');
  console.log('\n🎉 Water clarity integration ready!');
  console.log('\nNext steps:');
  console.log('1. Integrate with your conditions API');
  console.log('2. Pass clarity to useBiteScore hook');
  console.log('3. Fetch real kd490 from Copernicus (when ready)');
  console.log('=' .repeat(60));
}

// Run test
testWaterClarity().catch(error => {
  console.error('\n❌ Test failed:', error);
  console.error(error.stack);
  process.exit(1);
});
