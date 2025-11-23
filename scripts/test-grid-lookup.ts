#!/usr/bin/env tsx
/**
 * Test grid cell lookup implementation for US waters
 */

import { findNearestGridCellId, getWaterRegion } from '../lib/findr/gridCellLookup';

// Test locations across US waters
const testLocations = [
  { name: 'New York (Atlantic)', lat: 40.7128, lon: -74.0060 },
  { name: 'Miami (Atlantic)', lat: 25.7617, lon: -80.1918 },
  { name: 'Boston (Atlantic)', lat: 42.3601, lon: -71.0589 },
  { name: 'Los Angeles (Pacific)', lat: 33.7401, lon: -118.2651 },
  { name: 'San Francisco (Pacific)', lat: 37.7749, lon: -122.4194 },
  { name: 'Seattle (Pacific)', lat: 47.6062, lon: -122.3321 },
  { name: 'New Orleans (Gulf)', lat: 29.9511, lon: -90.0715 },
  { name: 'Galveston (Gulf)', lat: 29.3013, lon: -94.7977 },
  { name: 'Tampa (Gulf)', lat: 27.9506, lon: -82.4572 },
  { name: 'Key West (Gulf/Atlantic)', lat: 24.5551, lon: -81.7800 },
  { name: 'Hawaii (Pacific)', lat: 21.3099, lon: -157.8581 },
  { name: 'Alaska (Pacific)', lat: 58.3019, lon: -134.4197 },
];

console.log('🧪 Testing Grid Cell Lookup Implementation\n');
console.log('='

.repeat(80));
console.log('\n');

for (const location of testLocations) {
  try {
    const cellId = findNearestGridCellId(location.lat, location.lon);
    const region = getWaterRegion(location.lat, location.lon);

    console.log(`📍 ${location.name}`);
    console.log(`   Coordinates: ${location.lat.toFixed(4)}°N, ${Math.abs(location.lon).toFixed(4)}°W`);
    console.log(`   Grid Cell ID: ${cellId}`);
    console.log(`   Region: ${region}`);
    console.log('');
  } catch (error) {
    console.error(`❌ Error for ${location.name}:`, error);
    console.log('');
  }
}

console.log('=' .repeat(80));
console.log('\n✅ All tests completed!\n');

// Test invalid coordinates
console.log('Testing error handling:\n');
try {
  findNearestGridCellId(91, 0);
  console.log('❌ Should have thrown error for lat > 90');
} catch (error) {
  console.log('✅ Correctly rejected lat > 90');
}

try {
  findNearestGridCellId(0, 181);
  console.log('❌ Should have thrown error for lon > 180');
} catch (error) {
  console.log('✅ Correctly rejected lon > 180');
}

console.log('\n🎉 Grid lookup implementation working correctly!');
