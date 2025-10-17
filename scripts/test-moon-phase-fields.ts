#!/usr/bin/env tsx
/**
 * Test script for moon phase stage and countdown fields
 */

import { getMoonSunData } from '../lib/astro/moonService';

async function testMoonPhaseFields() {
  console.log('🌙 Testing Moon Phase Stage and Countdown Fields\n');
  console.log('='.repeat(60));

  try {
    // Test with London coordinates
    const lat = 51.5074;
    const lon = -0.1278;
    
    console.log(`\nFetching moon data for London (${lat}, ${lon})...\n`);
    
    const moonData = await getMoonSunData({ lat, lon });
    
    console.log('📊 Moon Phase Data:');
    console.log('─'.repeat(60));
    console.log(`Phase Name:              ${moonData.moonPhaseName || 'N/A'}`);
    console.log(`Phase Fraction:          ${moonData.moonPhaseFraction?.toFixed(4) || 'N/A'}`);
    console.log(`Phase Stage:             ${moonData.moonPhaseStage || 'N/A'} ⭐ NEW`);
    console.log(`Illumination:            ${moonData.moonIlluminationPct?.toFixed(1) || 'N/A'}%`);
    console.log(`Days Until Full Moon:    ${moonData.daysUntilNextFullMoon ?? 'N/A'} days ⭐ NEW`);
    console.log(`Days Until New Moon:     ${moonData.daysUntilNextNewMoon ?? 'N/A'} days ⭐ NEW`);
    console.log('─'.repeat(60));
    
    console.log('\n🕐 Time Data:');
    console.log('─'.repeat(60));
    console.log(`Sunrise:                 ${moonData.sunriseISO || 'N/A'}`);
    console.log(`Sunset:                  ${moonData.sunsetISO || 'N/A'}`);
    console.log(`Moonrise:                ${moonData.moonriseISO || 'N/A'}`);
    console.log(`Moonset:                 ${moonData.moonsetISO || 'N/A'}`);
    console.log(`Day Length:              ${moonData.dayLengthMinutes || 'N/A'} minutes`);
    console.log('─'.repeat(60));
    
    console.log('\n📦 Cache Info:');
    console.log('─'.repeat(60));
    console.log(`Source:                  ${moonData.source}`);
    console.log(`Local Date:              ${moonData.localDate}`);
    console.log(`Timezone:                ${moonData.timezone}`);
    console.log(`Cached At:               ${moonData.cachedAt}`);
    console.log(`Expires At:              ${moonData.expiresAt}`);
    console.log('─'.repeat(60));
    
    // Validation
    console.log('\n✅ Validation:');
    console.log('─'.repeat(60));
    
    const validations = [
      { name: 'Phase Stage exists', pass: !!moonData.moonPhaseStage },
      { name: 'Phase Stage is waxing or waning', pass: moonData.moonPhaseStage === 'waxing' || moonData.moonPhaseStage === 'waning' },
      { name: 'Days Until Full Moon is a number', pass: typeof moonData.daysUntilNextFullMoon === 'number' },
      { name: 'Days Until New Moon is a number', pass: typeof moonData.daysUntilNextNewMoon === 'number' },
      { name: 'Days Until Full Moon is 0-29', pass: (moonData.daysUntilNextFullMoon ?? -1) >= 0 && (moonData.daysUntilNextFullMoon ?? 30) <= 29 },
      { name: 'Days Until New Moon is 0-29', pass: (moonData.daysUntilNextNewMoon ?? -1) >= 0 && (moonData.daysUntilNextNewMoon ?? 30) <= 29 },
    ];
    
    validations.forEach(({ name, pass }) => {
      console.log(`${pass ? '✓' : '✗'} ${name}`);
    });
    
    const allPassed = validations.every(v => v.pass);
    console.log('─'.repeat(60));
    console.log(allPassed ? '\n🎉 All validations passed!' : '\n⚠️  Some validations failed!');
    
  } catch (error) {
    console.error('\n❌ Error testing moon phase fields:', error);
    process.exit(1);
  }
}

testMoonPhaseFields();
