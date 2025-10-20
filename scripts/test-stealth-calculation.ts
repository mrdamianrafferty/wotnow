// Quick test of new stealth calculation
import { calculateStealthIndex } from '../utils/bioMarineLevels';

// Test Bay of Biscay location at different times
const lat = 43.75;
const lon = -6.5;

console.log('🎣 Testing New Stealth Index Calculation\n');
console.log('Location: Bay of Biscay (43.75°N, 6.5°W)\n');

// Test 1: Midday (high sun)
const midday = new Date('2025-10-20T12:00:00Z');
const stealthMidday = calculateStealthIndex(lat, lon, 20, 50, midday);
console.log('☀️  Midday (12:00 UTC, 20% clouds, 50% clarity):');
console.log(`   Result: ${stealthMidday} → Expected: ~60-80 (high light, fish wary)\n`);

// Test 2: Night
const night = new Date('2025-10-20T02:00:00Z');
const stealthNight = calculateStealthIndex(lat, lon, 20, 50, night);
console.log('🌙 Night (02:00 UTC, 20% clouds, 50% clarity):');
console.log(`   Result: ${stealthNight} → Expected: ~0-10 (low light, fish confident)\n`);

// Test 3: Sunrise/Sunset (twilight)
const twilight = new Date('2025-10-20T06:30:00Z');
const stealthTwilight = calculateStealthIndex(lat, lon, 20, 50, twilight);
console.log('🌅 Twilight (06:30 UTC, 20% clouds, 50% clarity):');
console.log(`   Result: ${stealthTwilight} → Expected: ~20-40 (moderate light)\n`);

// Test 4: Heavy clouds
const cloudyDay = new Date('2025-10-20T12:00:00Z');
const stealthCloudy = calculateStealthIndex(lat, lon, 90, 50, cloudyDay);
console.log('☁️  Cloudy midday (12:00 UTC, 90% clouds, 50% clarity):');
console.log(`   Result: ${stealthCloudy} → Expected: ~20-30 (clouds block light)\n`);

// Test 5: Crystal clear water
const clearWater = new Date('2025-10-20T12:00:00Z');
const stealthClear = calculateStealthIndex(lat, lon, 10, 90, clearWater);
console.log('💎 Clear water midday (12:00 UTC, 10% clouds, 90% clarity):');
console.log(`   Result: ${stealthClear} → Expected: ~80-95 (maximum light penetration)\n`);

// Test 6: Murky water
const murkyWater = new Date('2025-10-20T12:00:00Z');
const stealthMurky = calculateStealthIndex(lat, lon, 10, 10, murkyWater);
console.log('🌫️  Murky water midday (12:00 UTC, 10% clouds, 10% clarity):');
console.log(`   Result: ${stealthMurky} → Expected: ~55-70 (water blocks some light)\n`);

// Test 7: No cloud/clarity data (minimal inputs)
const minimal = new Date('2025-10-20T12:00:00Z');
const stealthMinimal = calculateStealthIndex(lat, lon, null, null, minimal);
console.log('🔧 Minimal data (12:00 UTC, no cloud/clarity data):');
console.log(`   Result: ${stealthMinimal} → Expected: ~60-80 (based on sun position only)\n`);

console.log('✅ All tests completed!');
console.log('\n📋 Summary:');
console.log('   - Stealth now works without UV Index dependency');
console.log('   - Calculates from: sun position + cloud cover + water clarity');
console.log('   - Works with lat/lon alone (cloud/clarity optional)');
