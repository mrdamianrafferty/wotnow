// Quick database status check
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('🔍 Checking database status...\n');

  // 1. Check rectangles
  console.log('1. Sample ICES Rectangles:');
  const { data: rects, error: rectsErr } = await supabase
    .from('ices_rectangles')
    .select('code, biogeographic_region, center_lat, center_lon')
    .limit(5);

  if (rectsErr) {
    console.error('   ❌ Error:', rectsErr.message);
  } else {
    console.log(`   ✅ Found ${rects?.length} rectangles`);
    rects?.forEach(r => console.log(`      - ${r.code}: ${r.biogeographic_region} (${r.center_lat}, ${r.center_lon})`));
  }

  // 2. Check specific test rectangles
  console.log('\n2. Test Rectangles (31F1, 28E5, 39F3):');
  const testCodes = ['31F1', '28E5', '39F3'];
  for (const code of testCodes) {
    const { data, error } = await supabase
      .from('ices_rectangles')
      .select('code, biogeographic_region')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      console.log(`   ❌ ${code}: Error - ${error.message}`);
    } else if (!data) {
      console.log(`   ⚠️  ${code}: Not found`);
    } else {
      console.log(`   ✅ ${code}: Found (${data.biogeographic_region})`);
    }
  }

  // 3. Check conditions data
  console.log('\n3. Conditions Data:');
  const { count: condCount } = await supabase
    .from('findr_conditions_latest')
    .select('*', { count: 'exact', head: true });

  console.log(`   ✅ ${condCount} rectangles with conditions`);

  // Get sample with data
  const { data: sampleConds } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, sea_temp_c, salinity_ppt, captured_at')
    .not('sea_temp_c', 'is', null)
    .limit(3);

  console.log('   Sample conditions:');
  sampleConds?.forEach(c => {
    const age = ((Date.now() - new Date(c.captured_at).getTime()) / (1000 * 60 * 60)).toFixed(1);
    console.log(`      - ${c.rectangle_code}: ${c.sea_temp_c}°C, ${c.salinity_ppt} ppt (${age}h old)`);
  });

  // 4. Check species
  console.log('\n4. Species:');
  const { count: speciesCount } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true });

  console.log(`   ✅ ${speciesCount} species in database`);

  const { data: sampleSpecies } = await supabase
    .from('species')
    .select('common_name_en, biogeographic_regions, guild, environmental_preferences')
    .limit(3);

  console.log('   Sample species:');
  sampleSpecies?.forEach(s => {
    const prefs = s.environmental_preferences as any;
    const hasTemp = prefs?.temperature?.min != null;
    const hasSal = prefs?.salinity?.min != null;
    console.log(`      - ${s.common_name_en} (${s.guild}): ${hasTemp ? '✓' : '✗'} temp, ${hasSal ? '✓' : '✗'} salinity`);
  });

  // 5. Check RPC functions
  console.log('\n5. RPC Functions:');

  // Try the enhanced version
  const testRect = sampleConds?.[0]?.rectangle_code || '31F2';
  console.log(`   Testing with rectangle: ${testRect}`);

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_environmental_predictions_enhanced', {
    target_rectangle: testRect,
    limit_results: 5
  });

  if (rpcError) {
    console.log(`   ❌ RPC Error: ${rpcError.message}`);
    console.log(`      Code: ${rpcError.code}`);
    console.log(`      Details: ${rpcError.details}`);
  } else {
    console.log(`   ✅ RPC working! Returned ${rpcData?.length} predictions`);
    if (rpcData && rpcData.length > 0) {
      console.log('   Top prediction:');
      const top = rpcData[0];
      console.log(`      - ${top.common_name_en}: ${top.confidence_score}% confidence, bite: ${top.bite_score}`);
    }
  }

  console.log('\n✅ Database check complete\n');
}

main().catch(console.error);
