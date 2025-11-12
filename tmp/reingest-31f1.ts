// Targeted re-ingestion for rectangle 31F1
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function reingest31F1() {
  console.log('🎯 Targeted re-ingestion for 31F1 (English Channel)\n');

  // Use the targeted-reingest script
  const { stdout, stderr } = await execPromise(
    'npx tsx scripts/targeted-reingest.ts 31F1',
    { env: { ...process.env, FINDR_MET_SIMPLE_PROBES: '1' } }
  );

  console.log(stdout);
  if (stderr) console.error(stderr);

  // Verify the data
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, sea_temp_c, captured_at')
    .eq('rectangle_code', '31F1')
    .maybeSingle();

  console.log('\n✅ Verification:');
  if (error) {
    console.error('   Error:', error);
  } else if (!data) {
    console.log('   ❌ No data found for 31F1');
  } else {
    console.log(`   Temperature: ${data.sea_temp_c}°C`);
    console.log(`   Captured at: ${data.captured_at}`);
    console.log(`   Expected: ~12-17°C for November`);

    if (data.sea_temp_c && data.sea_temp_c > 20) {
      console.log('   ⚠️  WARNING: Temperature still seems too high!');
    } else if (data.sea_temp_c && data.sea_temp_c >= 12 && data.sea_temp_c <= 18) {
      console.log('   ✅ Temperature looks correct!');
    }
  }
}

reingest31F1().catch(console.error);
