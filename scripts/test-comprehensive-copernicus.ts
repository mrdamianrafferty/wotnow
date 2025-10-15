/**
 * Comprehensive Test - Full Copernicus Integration
 * Tests: Water clarity, ocean currents, thermocline, waves, food chain
 */

import { MockCopernicusProvider } from '../lib/copernicus/mockClient';
import { toCopernicusMarineData } from '../lib/copernicus/transformers';
import { calculateWaterClarity } from '../lib/utils/waterClarity';
import { analyzeCurrent, isFavorableForStrategy } from '../lib/utils/oceanCurrent';

async function main() {
  console.log('\n🌊 ============================================');
  console.log('   COMPREHENSIVE COPERNICUS INTEGRATION TEST');
  console.log('   ============================================\n');

  // Initialize mock provider
  const provider = new MockCopernicusProvider();
  
  // Fetch mock bundle
  const bundle = await provider.fetchBundle({
    lat: 43.55,
    lon: -6.25,
    start: '2025-09-27T00:00:00Z',
    end: '2025-09-27T23:59:59Z',
  });

  // Transform to marine data
  const data = toCopernicusMarineData(bundle);
  const snapshot = data.snapshots[0]; // First snapshot (06:00)

  console.log('📍 Location:', `${data.location.lat}°N, ${Math.abs(data.location.lon)}°W`);
  console.log('🕐 Timestamp:', snapshot.timestamp);
  console.log('📊 Datasets:', data.metadata.datasets.join(', '));
  console.log('\n');

  // ========================================================================
  // TEST 1: WATER CLARITY (Previously tested, quick verification)
  // ========================================================================
  console.log('🔬 TEST 1: WATER CLARITY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const clarity = calculateWaterClarity(snapshot.kd490Surface, snapshot.chlorophyllSurface);
  if (clarity) {
    console.log(`✅ kd490: ${snapshot.kd490Surface?.toFixed(3)} (1/m)`);
    console.log(`✅ Chlorophyll: ${snapshot.chlorophyllSurface?.toFixed(2)} mg/m³`);
    console.log(`✅ Clarity Index: ${clarity.clarity_index.toFixed(3)} (${clarity.method})`);
    console.log(`✅ Confidence: ${clarity.confidence}`);
  }
  console.log('\n');

  // ========================================================================
  // TEST 2: OCEAN CURRENTS (NEW - CRITICAL FOR FISHING)
  // ========================================================================
  console.log('🌀 TEST 2: OCEAN CURRENTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (snapshot.currentEastSurface !== undefined && snapshot.currentNorthSurface !== undefined) {
    console.log(`✅ Eastward velocity (uo): ${snapshot.currentEastSurface.toFixed(3)} m/s`);
    console.log(`✅ Northward velocity (vo): ${snapshot.currentNorthSurface.toFixed(3)} m/s`);
    console.log(`✅ Current speed: ${snapshot.currentSpeedSurface?.toFixed(3)} m/s`);
    console.log(`✅ Current direction: ${snapshot.currentDirectionSurface?.toFixed(1)}°`);
    
    const currentAnalysis = analyzeCurrent(
      snapshot.currentEastSurface,
      snapshot.currentNorthSurface
    );
    
    console.log(`\n📊 Current Analysis:`);
    console.log(`   Speed: ${currentAnalysis.current.speed_ms.toFixed(3)} m/s`);
    console.log(`   Feeding Score: ${currentAnalysis.feeding_score.toFixed(2)} (1.0 = ideal)`);
    console.log(`   Interpretation: ${currentAnalysis.interpretation}`);
    console.log(`\n🎣 Fishing Recommendations:`);
    currentAnalysis.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
    
    // Test hunting strategies
    console.log(`\n🦈 Hunting Strategy Suitability:`);
    console.log(`   Scent hunters (sharks/rays): ${isFavorableForStrategy(currentAnalysis.current, 'scent_hunter') ? '✅ FAVORABLE' : '❌ NOT IDEAL'}`);
    console.log(`   Ambush predators (bass): ${isFavorableForStrategy(currentAnalysis.current, 'ambush_predator') ? '✅ FAVORABLE' : '❌ NOT IDEAL'}`);
    console.log(`   Active chasers (mackerel): ${isFavorableForStrategy(currentAnalysis.current, 'active_chaser') ? '✅ FAVORABLE' : '❌ NOT IDEAL'}`);
    console.log(`   Bottom feeders (flatfish): ${isFavorableForStrategy(currentAnalysis.current, 'bottom_feeder') ? '✅ FAVORABLE' : '❌ NOT IDEAL'}`);
  } else {
    console.log('❌ No current data available');
  }
  console.log('\n');

  // ========================================================================
  // TEST 3: THERMOCLINE (Mixed Layer Depth)
  // ========================================================================
  console.log('🌡️ TEST 3: THERMOCLINE DEPTH');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (snapshot.mixedLayerDepth !== undefined) {
    console.log(`✅ Mixed layer depth: ${snapshot.mixedLayerDepth.toFixed(1)}m`);
    console.log(`\n🐟 Fishing Implications:`);
    console.log(`   • Thermocline at ~${Math.round(snapshot.mixedLayerDepth)}m depth`);
    console.log(`   • Fish and baitfish congregate here`);
    console.log(`   • Target depth: ${Math.round(snapshot.mixedLayerDepth - 5)}m to ${Math.round(snapshot.mixedLayerDepth + 5)}m`);
    
    if (snapshot.mixedLayerDepth < 15) {
      console.log(`   ⚠️ Shallow thermocline - fish may be surface feeding`);
    } else if (snapshot.mixedLayerDepth > 30) {
      console.log(`   ⚠️ Deep thermocline - need deeper rigs`);
    } else {
      console.log(`   ✅ Ideal thermocline depth for fishing`);
    }
  } else {
    console.log('❌ No thermocline data available');
  }
  console.log('\n');

  // ========================================================================
  // TEST 4: UPWELLING (Sea Surface Height)
  // ========================================================================
  console.log('⬆️ TEST 4: UPWELLING INDICATOR');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (snapshot.seaSurfaceHeight !== undefined) {
    console.log(`✅ Sea surface height: ${snapshot.seaSurfaceHeight.toFixed(3)}m`);
    
    if (snapshot.seaSurfaceHeight > 0.1) {
      console.log(`   🌊 UPWELLING DETECTED - nutrient-rich water`);
      console.log(`   • Increased plankton productivity`);
      console.log(`   • Attracts baitfish and predators`);
      console.log(`   • Excellent fishing conditions`);
    } else if (snapshot.seaSurfaceHeight < -0.1) {
      console.log(`   ⬇️ Downwelling - water sinking`);
      console.log(`   • Less productive conditions`);
    } else {
      console.log(`   ➡️ Neutral conditions`);
    }
  } else {
    console.log('❌ No upwelling data available');
  }
  console.log('\n');

  // ========================================================================
  // TEST 5: FOOD CHAIN INDICATORS
  // ========================================================================
  console.log('🦐 TEST 5: FOOD CHAIN INDICATORS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (snapshot.zooplanktonSurface !== undefined) {
    console.log(`✅ Zooplankton: ${snapshot.zooplanktonSurface.toFixed(2)} mmol/m³`);
    
    if (snapshot.zooplanktonSurface > 2.0) {
      console.log(`   🎯 HIGH zooplankton - baitfish present!`);
      console.log(`   • Attracts small fish (sardines, anchovies)`);
      console.log(`   • Predators will follow`);
    } else {
      console.log(`   ➡️ Moderate zooplankton levels`);
    }
  }
  
  if (snapshot.phytoplanktonSurface !== undefined) {
    console.log(`✅ Phytoplankton: ${snapshot.phytoplanktonSurface.toFixed(2)} mmol/m³`);
    
    if (snapshot.phytoplanktonSurface > 12.0) {
      console.log(`   🌿 Active primary production`);
      console.log(`   • Healthy ecosystem base`);
    }
  }
  
  if (snapshot.primaryProductionSurface !== undefined) {
    console.log(`✅ Net primary production: ${snapshot.primaryProductionSurface.toFixed(1)} mg C/m³/day`);
    
    if (snapshot.primaryProductionSurface > 300) {
      console.log(`   📈 HIGH productivity ecosystem`);
      console.log(`   • Abundant food chain`);
      console.log(`   • Excellent long-term fishing prospects`);
    }
  }
  console.log('\n');

  // ========================================================================
  // TEST 6: DETAILED WAVE CONDITIONS
  // ========================================================================
  console.log('🌊 TEST 6: WAVE CONDITIONS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (snapshot.significantWaveHeight !== undefined) {
    console.log(`✅ Significant wave height: ${snapshot.significantWaveHeight.toFixed(2)}m`);
  }
  
  if (snapshot.waveDirection !== undefined) {
    console.log(`✅ Wave direction: ${snapshot.waveDirection.toFixed(1)}° (from)`);
  }
  
  if (snapshot.wavePeriod !== undefined) {
    console.log(`✅ Wave period: ${snapshot.wavePeriod.toFixed(1)}s`);
    
    if (snapshot.wavePeriod >= 7 && snapshot.wavePeriod <= 12) {
      console.log(`   ✅ IDEAL wave period for surf fishing`);
      console.log(`   • Good wave structure`);
      console.log(`   • Fish feeding in surf zone`);
    } else if (snapshot.wavePeriod < 7) {
      console.log(`   ⚠️ Short period - choppy conditions`);
    } else {
      console.log(`   ⚠️ Long period - big swell`);
    }
  }
  
  if (snapshot.windSeaHeight !== undefined && snapshot.swellHeight !== undefined) {
    console.log(`\n📊 Wave Composition:`);
    console.log(`   Wind sea: ${snapshot.windSeaHeight.toFixed(2)}m (local waves)`);
    console.log(`   Swell: ${snapshot.swellHeight.toFixed(2)}m (ocean swell)`);
    
    const swellDominant = snapshot.swellHeight > snapshot.windSeaHeight;
    if (swellDominant) {
      console.log(`   🌊 Swell-dominated (cleaner waves)`);
    } else {
      console.log(`   🌬️ Wind-dominated (choppy conditions)`);
    }
  }
  console.log('\n');

  // ========================================================================
  // TEST 7: DEPTH PROFILE
  // ========================================================================
  console.log('📊 TEST 7: DEPTH PROFILE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Depth\tTemp\tSalinity\tChlorophyll\tkd490\tCurrent');
  console.log('-----\t----\t--------\t-----------\t-----\t-------');
  
  snapshot.depthProfile.slice(0, 3).forEach(point => {
    const temp = point.temperature?.toFixed(1) ?? 'N/A';
    const sal = point.salinity?.toFixed(1) ?? 'N/A';
    const chl = point.chlorophyll?.toFixed(2) ?? 'N/A';
    const kd = point.kd490?.toFixed(3) ?? 'N/A';
    const curr = point.currentEast !== undefined && point.currentNorth !== undefined
      ? `${Math.sqrt(point.currentEast**2 + point.currentNorth**2).toFixed(2)} m/s`
      : 'N/A';
    
    console.log(`${point.depth}m\t${temp}°C\t${sal} PSU\t${chl} mg/m³\t${kd}\t${curr}`);
  });
  console.log('\n');

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log('🎯 ============================================');
  console.log('   INTEGRATION SUMMARY');
  console.log('   ============================================\n');
  
  const features = [
    { name: 'Water Clarity (kd490)', present: snapshot.kd490Surface !== undefined, critical: true },
    { name: 'Ocean Currents (uo/vo)', present: snapshot.currentSpeedSurface !== undefined, critical: true },
    { name: 'Thermocline Depth', present: snapshot.mixedLayerDepth !== undefined, critical: false },
    { name: 'Upwelling Indicator', present: snapshot.seaSurfaceHeight !== undefined, critical: false },
    { name: 'Zooplankton', present: snapshot.zooplanktonSurface !== undefined, critical: false },
    { name: 'Wave Period', present: snapshot.wavePeriod !== undefined, critical: false },
  ];
  
  console.log('Feature Availability:');
  features.forEach(f => {
    const icon = f.present ? '✅' : '❌';
    const priority = f.critical ? '🔥 CRITICAL' : '  optional';
    console.log(`  ${icon} ${f.name.padEnd(30)} ${priority}`);
  });
  
  const criticalCount = features.filter(f => f.critical && f.present).length;
  const criticalTotal = features.filter(f => f.critical).length;
  const optionalCount = features.filter(f => !f.critical && f.present).length;
  const optionalTotal = features.filter(f => !f.critical).length;
  
  console.log(`\n📊 Coverage:`);
  console.log(`   Critical features: ${criticalCount}/${criticalTotal} (${Math.round(criticalCount/criticalTotal*100)}%)`);
  console.log(`   Optional features: ${optionalCount}/${optionalTotal} (${Math.round(optionalCount/optionalTotal*100)}%)`);
  
  if (criticalCount === criticalTotal) {
    console.log(`\n🎉 ALL CRITICAL FEATURES READY!`);
    console.log(`   ✅ Water clarity for sight feeders`);
    console.log(`   ✅ Ocean currents for ALL species`);
    console.log(`\n🐟 Species that benefit:`);
    console.log(`   🦈 Sharks/Rays: Scent trails in currents`);
    console.log(`   🐟 Bass: Hunt at current breaks + water clarity`);
    console.log(`   🐠 Mackerel: Current-driven baitfish + clarity`);
    console.log(`   🎯 Plaice: Bottom + water clarity`);
    console.log(`   🌊 ALL: More accurate bite predictions`);
  }
  
  console.log('\n============================================\n');
}

main().catch(console.error);
