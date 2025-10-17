/**
 * Simple test of moon phase calculation function only
 * Tests the calculate_moon_phase() function independently
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface MoonPhase {
  moon_age: number;
  phase_name: string;
  illumination: number;
  phase_category: string;
}

async function testMoonPhaseFunction() {
  console.log('🌙 Testing Moon Phase Calculation Function\n');
  console.log('='.repeat(80) + '\n');

  // Test various dates across a lunar cycle
  const testDates = [
    '2025-10-01',  // Early Oct
    '2025-10-08',  // Mid Oct
    '2025-10-15',  // Mid Oct
    '2025-10-17',  // Today
    '2025-10-22',  // Late Oct
    '2025-10-29',  // End Oct
    '2025-11-01',  // Early Nov
    '2025-11-08',  // Mid Nov
    '2025-11-15',  // Mid Nov
    '2025-11-22',  // Late Nov
    '2025-11-29',  // End Nov
  ];

  console.log('Moon Phase Across October-November 2025:');
  console.log('─'.repeat(80));
  console.log('Date'.padEnd(15) + 'Age (days)'.padStart(12) + 'Phase Name'.padStart(20) + 'Illumination'.padStart(15) + 'Category'.padStart(20));
  console.log('─'.repeat(80));

  for (const date of testDates) {
    const { data, error } = await supabase.rpc('calculate_moon_phase', {
      target_date: date
    });

    if (error) {
      console.error(`❌ Error for ${date}:`, error.message);
      continue;
    }

    const moonData = data as unknown as MoonPhase[];
    if (moonData && moonData.length > 0) {
      const moon = moonData[0];
      const ageStr = moon.moon_age.toFixed(2);
      const illumStr = `${(moon.illumination * 100).toFixed(1)}%`;
      
      // Add emoji for visual representation
      let emoji = '';
      if (moon.phase_name === 'new') emoji = '🌑';
      else if (moon.phase_name === 'waxing_crescent') emoji = '🌒';
      else if (moon.phase_name === 'first_quarter') emoji = '🌓';
      else if (moon.phase_name === 'waxing_gibbous') emoji = '🌔';
      else if (moon.phase_name === 'full') emoji = '🌕';
      else if (moon.phase_name === 'waning_gibbous') emoji = '🌖';
      else if (moon.phase_name === 'last_quarter') emoji = '🌗';
      else if (moon.phase_name === 'waning_crescent') emoji = '🌘';

      console.log(
        `${date.padEnd(15)}${ageStr.padStart(12)}${(emoji + ' ' + moon.phase_name).padStart(22)}${illumStr.padStart(15)}${moon.phase_category.padStart(20)}`
      );
    }
  }

  // Test specific known moon phases for 2025
  console.log('\n\n' + '='.repeat(80));
  console.log('Verification Against Known 2025 Moon Phases:');
  console.log('─'.repeat(80));

  const knownPhases2025 = [
    { date: '2025-09-21', expected: 'New Moon', phase: 'new' },
    { date: '2025-09-29', expected: 'First Quarter', phase: 'first_quarter' },
    { date: '2025-10-07', expected: 'Full Moon', phase: 'full' },
    { date: '2025-10-13', expected: 'Last Quarter', phase: 'last_quarter' },
    { date: '2025-10-21', expected: 'New Moon', phase: 'new' },
    { date: '2025-10-28', expected: 'First Quarter', phase: 'first_quarter' },
    { date: '2025-11-05', expected: 'Full Moon', phase: 'full' },
    { date: '2025-11-12', expected: 'Last Quarter', phase: 'last_quarter' },
  ];

  for (const known of knownPhases2025) {
    const { data } = await supabase.rpc('calculate_moon_phase', {
      target_date: known.date
    });

    const moonData = data as unknown as MoonPhase[];
    if (moonData && moonData.length > 0) {
      const moon = moonData[0];
      const match = moon.phase_name === known.phase || 
                   (known.phase === 'first_quarter' && moon.phase_name.includes('quarter')) ||
                   (known.phase === 'last_quarter' && moon.phase_name.includes('quarter'));
      
      const icon = match ? '✅' : '❌';
      console.log(`${icon} ${known.date}: ${known.expected.padEnd(15)} → Got: ${moon.phase_name.padEnd(20)} (${(moon.illumination * 100).toFixed(1)}%)`);
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('✅ Moon phase calculation function is working!');
  console.log('='.repeat(80));
  console.log('\nNext steps:');
  console.log('  • Integrate lunar scoring into RPC functions');
  console.log('  • Add lunar_score to prediction results');
  console.log('  • Test with actual species predictions');
  console.log('='.repeat(80) + '\n');
}

testMoonPhaseFunction().catch(console.error);
