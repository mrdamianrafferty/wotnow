import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function debug() {
  console.log('Debugging empty predictions...\n');
  
  // Test 1: Check if environmental data exists
  const { data: envData, error: envError } = await supabase
    .from('findr_conditions_snapshots')
    .select('*')
    .eq('rectangle_code', '25E1')
    .limit(1);
    
  console.log('1. Environmental data for 25E1:');
  console.log(`   ${envError ? '❌ Error: ' + envError.message : envData && envData.length > 0 ? '✅ Data exists' : '⚠️  No data'}`);
  if (envData && envData.length > 0) {
    console.log(`   Latest: ${envData[0].captured_at}, Temp: ${envData[0].sea_temp_c}°C`);
  }
  
  // Test 2: Call RPC with debugging
  console.log('\n2. Testing RPC function...');
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_environmental_predictions_basic', {
    target_rectangle: '25E1',
    target_date: '2025-10-18'
  });
  
  console.log(`   ${rpcError ? '❌ RPC Error: ' + rpcError.message : `✅ RPC Success: ${rpcData?.length || 0} predictions`}`);
  
  if (rpcData && rpcData.length > 0) {
    console.log('\n   Top 5 predictions:');
    rpcData.slice(0, 5).forEach((p: any) => {
      console.log(`     ${p.confidence}% - ${p.name_en}`);
    });
  }
  
  // Test 3: Check if the issue is with biogeographic filtering
  console.log('\n3. Checking filter logic...');
  console.log('   The RPC function filters species by biogeographic_regions matching rectangle region');
  console.log('   Rectangle "Bay of Biscay" should match species with "Bay of Biscay" in their array');
}

debug().catch(console.error);
