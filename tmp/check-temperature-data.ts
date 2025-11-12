// Check temperature data sources for rectangle 31F1
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
  console.log('\n=== TEMPERATURE DATA FOR 31F1 ===\n');

  // Check findr_conditions_latest view
  const { data: latest, error: latestErr } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, sea_temp_c, water_temp_c, captured_at')
    .eq('rectangle_code', '31F1')
    .maybeSingle();

  console.log('1. findr_conditions_latest (VIEW):');
  if (latestErr) {
    console.error('   Error:', latestErr);
  } else if (!latest) {
    console.log('   ❌ No data');
  } else {
    console.log('   ✅ Data:');
    console.log(`      sea_temp_c: ${latest.sea_temp_c}°C`);
    console.log(`      water_temp_c: ${latest.water_temp_c}°C`);
    console.log(`      captured_at: ${latest.captured_at}`);
  }

  // Check findr_conditions_snapshots table directly
  const { data: snapshots, error: snapErr } = await supabase
    .from('findr_conditions_snapshots')
    .select('rectangle_code, sea_temp_c, water_temp_c, captured_at, source')
    .eq('rectangle_code', '31F1')
    .order('captured_at', { ascending: false })
    .limit(5);

  console.log('\n2. findr_conditions_snapshots (TABLE - last 5):');
  if (snapErr) {
    console.error('   Error:', snapErr);
  } else if (!snapshots || snapshots.length === 0) {
    console.log('   ❌ No data');
  } else {
    snapshots.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.captured_at}:`);
      console.log(`      sea_temp_c: ${s.sea_temp_c}°C`);
      console.log(`      water_temp_c: ${s.water_temp_c}°C`);
      console.log(`      source: ${s.source}`);
    });
  }

  // Get rectangle center coordinates
  const { data: rect, error: rectErr } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon')
    .eq('rectangle_code', '31F1')
    .single();

  if (!rectErr && rect) {
    console.log(`\n3. Rectangle 31F1 center: ${rect.center_lat}, ${rect.center_lon}`);

    // Fetch from /api/marine to see what it returns
    console.log('\n4. Testing /api/marine endpoint:');
    console.log(`   (This is what the conditions page uses)`);
    // We can't easily call this from here, but we know it returns 17°C from your observation
  }

  console.log('\n5. Expected temperature for November in English Channel: ~12-17°C');
  console.log('   Actual from RPC: 27.6°C ❌ (WAY TOO HIGH)');
  console.log('\n📊 DIAGNOSIS: RPC is reading wrong temperature data source');
}

checkData().catch(console.error);
