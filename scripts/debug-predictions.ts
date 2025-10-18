#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debug() {
  console.log('🔍 Debugging predictions for 21D8 and 25E1...\n');

  // Check 21D8 (where Bogue is appearing)
  const { data: rect21D8 } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region')
    .eq('rectangle_code', '21D8')
    .single();

  console.log(`📍 21D8 region: ${rect21D8?.region}`);

  const { data: preds21D8 } = await supabase.rpc('get_environmental_predictions_basic', {
    target_rectangle: '21D8',
    target_date: '2025-10-18'
  });

  console.log(`✅ Got ${preds21D8?.length ?? 0} predictions for 21D8`);
  if (preds21D8 && preds21D8.length > 0) {
    console.log('\n📋 Top 5 for 21D8:');
    preds21D8.slice(0, 5).forEach((p: any) => {
      console.log(`  ${p.name_en}: ${p.confidence}% (bio:${p.bio_band_score}, temp:${p.temp_score}, fresh:${p.freshness_score})`);
    });
  }

  // Check Bogue's regions
  const { data: bogueData } = await supabase
    .from('species')
    .select('name_en, biogeographic_regions')
    .eq('name_en', 'Bogue')
    .single();

  console.log(`\n🐟 Bogue regions: ${bogueData?.biogeographic_regions?.join(', ')}`);

  // Now check 25E1 (Bay of Biscay)
  console.log('\n---\n');
  
  const { data: rect25E1 } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region')
    .eq('rectangle_code', '25E1')
    .single();

  console.log(`📍 25E1 region: ${rect25E1?.region}`);

  const { data: preds25E1 } = await supabase.rpc('get_environmental_predictions_basic', {
    target_rectangle: '25E1',
    target_date: '2025-10-18'
  });

  console.log(`✅ Got ${preds25E1?.length ?? 0} predictions for 25E1`);
  if (preds25E1 && preds25E1.length > 0) {
    console.log('\n📋 Top 5 for 25E1:');
    preds25E1.slice(0, 5).forEach((p: any) => {
      console.log(`  ${p.name_en}: ${p.confidence}% (bio:${p.bio_band_score}, temp:${p.temp_score}, fresh:${p.freshness_score})`);
    });
    
    // Check if Bogue is in the results
    const bogueInResults = preds25E1.find((p: any) => p.name_en === 'Bogue');
    if (bogueInResults) {
      console.log(`\n⚠️  Bogue found in 25E1 results at position ${preds25E1.indexOf(bogueInResults) + 1} with ${bogueInResults.confidence}%`);
    } else {
      console.log('\n✅ Bogue correctly filtered from 25E1 (Bay of Biscay)');
    }
  }
}

debug().catch(console.error);
