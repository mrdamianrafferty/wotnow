#!/usr/bin/env tsx
/**
 * Test script to verify weather term translations
 * Tests Beaufort scale descriptions and wave state labels
 */

import { translateText } from '../lib/i18n/translate';

const WEATHER_TERMS = {
  beaufort: [
    'Calm',
    'Light air',
    'Light breeze',
    'Gentle breeze',
    'Moderate breeze',
    'Fresh breeze',
    'Strong breeze',
    'High wind',
    'Gale',
    'Strong gale',
    'Storm',
    'Violent storm',
    'Hurricane',
  ],
  waveStates: [
    'Glassy',
    'Rippled',
    'Slight',
    'Moderate',
    'Choppy',
    'Rough',
    'Very rough',
    'High seas',
    'Stormy seas',
  ],
};

async function testTranslations() {
  console.log('🌍 Testing Weather Term Translations\n');
  console.log('Testing Portuguese (pt) translations...\n');

  // Test Beaufort scale
  console.log('📊 BEAUFORT SCALE:');
  console.log('='.repeat(60));
  for (const term of WEATHER_TERMS.beaufort) {
    const translated = await translateText(term, { targetLang: 'pt' });
    const status = translated === term ? '❌ NOT TRANSLATED' : '✅ TRANSLATED';
    console.log(`${status} | ${term.padEnd(20)} → ${translated}`);
  }

  console.log('\n🌊 WAVE STATES:');
  console.log('='.repeat(60));
  for (const term of WEATHER_TERMS.waveStates) {
    const translated = await translateText(term, { targetLang: 'pt' });
    const status = translated === term ? '❌ NOT TRANSLATED' : '✅ TRANSLATED';
    console.log(`${status} | ${term.padEnd(20)} → ${translated}`);
  }

  console.log('\n📝 Summary:');
  console.log('If terms show as "NOT TRANSLATED", they haven\'t been processed yet.');
  console.log('Run this script a few times - first run caches them, subsequent runs show cached results.');
}

testTranslations().catch(console.error);
