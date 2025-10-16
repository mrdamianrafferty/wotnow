#!/usr/bin/env node
/**
 * Debug substrate scoring by calling RPC directly and examining results
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugSubstrateScoring() {
  console.log('\n🔍 Debugging Substrate Scoring\n');
  
  // Test with rock substrate
  console.log('Testing: Rock substrate at 8m depth');
  console.log('==========================================\n');
  
  const { data: rockData, error: rockError } = await supabase.rpc(
    'get_environmental_predictions_enhanced',
    {
      target_rectangle: '37I0',
      target_date: '2025-10-16',
      user_lat: 50.1,
      user_lon: -5.5,
      user_substrate: 'rock',
      user_depth_m: 8,
    }
  );

  if (rockError) {
    console.error('Error:', rockError);
    return;
  }

  // Find wrasse (should get 25/25) and mullet (should get lower)
  const wrasse = rockData?.find((p: any) => p.name_en?.includes('Ballan Wrasse'));
  const mullet = rockData?.find((p: any) => p.name_en?.includes('Flathead Grey Mullet'));
  
  console.log('Ballan Wrasse (rock-only species):');
  console.log(`  Substrate score: ${wrasse?.substrate_score}/25 ${wrasse?.substrate_score === 25 ? '✅' : '❌ Should be 25'}`);
  console.log(`  Depth score: ${wrasse?.depth_score}/20`);
  console.log(`  Confidence: ${wrasse?.confidence}%\n`);
  
  console.log('Flathead Grey Mullet (sand+mixed species):');
  console.log(`  Substrate score: ${mullet?.substrate_score}/25 ${mullet?.substrate_score === 5 ? '✅' : '❌ Should be 5'}`);
  console.log(`  Depth score: ${mullet?.depth_score}/20`);
  console.log(`  Confidence: ${mullet?.confidence}%\n`);
  
  // Test with sand substrate
  console.log('\nTesting: Sand substrate at 45m depth');
  console.log('==========================================\n');
  
  const { data: sandData, error: sandError } = await supabase.rpc(
    'get_environmental_predictions_enhanced',
    {
      target_rectangle: '37I0',
      target_date: '2025-10-16',
      user_lat: 54.5,
      user_lon: 0.5,
      user_substrate: 'sand',
      user_depth_m: 45,
    }
  );

  if (sandError) {
    console.error('Error:', sandError);
    return;
  }

  const wrasse2 = sandData?.find((p: any) => p.name_en?.includes('Ballan Wrasse'));
  const mullet2 = sandData?.find((p: any) => p.name_en?.includes('Flathead Grey Mullet'));
  
  console.log('Ballan Wrasse (rock-only species):');
  console.log(`  Substrate score: ${wrasse2?.substrate_score}/25 ${wrasse2?.substrate_score === 5 ? '✅' : '❌ Should be 5'}`);
  console.log(`  Depth score: ${wrasse2?.depth_score}/20`);
  console.log(`  Confidence: ${wrasse2?.confidence}%\n`);
  
  console.log('Flathead Grey Mullet (sand+mixed species):');
  console.log(`  Substrate score: ${mullet2?.substrate_score}/25 ${mullet2?.substrate_score === 25 ? '✅' : '❌ Should be 25'}`);
  console.log(`  Depth score: ${mullet2?.depth_score}/20`);
  console.log(`  Confidence: ${mullet2?.confidence}%\n`);
  
  // Show substrate distribution
  const substrateCounts = { 5: 0, 15: 0, 25: 0 };
  sandData?.forEach((p: any) => {
    if (p.substrate_score in substrateCounts) {
      substrateCounts[p.substrate_score as keyof typeof substrateCounts]++;
    }
  });
  
  console.log('Substrate score distribution (sand substrate):');
  console.log(`  25pts (exact match): ${substrateCounts[25]} species`);
  console.log(`  15pts (generalist): ${substrateCounts[15]} species`);
  console.log(`  5pts (mismatch): ${substrateCounts[5]} species`);
}

debugSubstrateScoring();
