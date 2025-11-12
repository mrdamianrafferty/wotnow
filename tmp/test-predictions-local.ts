// Test predictions API locally by importing the handler directly
import { createMocks } from 'node-mocks-http';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Import handler - note: this will fail if we try to import the handler
// Let's instead test the database directly using the same approach the API uses

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TEST_RECTANGLES = [
  { code: '31F2', name: 'English Channel' },
  { code: '28E6', name: 'Celtic Sea' },
];

async function testDatabaseDirectly() {
  console.log('🔍 Testing database queries directly (same as API uses)\n');

  for (const rect of TEST_RECTANGLES) {
    console.log(`\n═══ Testing ${rect.code} (${rect.name}) ═══`);

    try {
      // 1. Check rectangle exists
      const { data: rectData, error: rectErr } = await supabase
        .from('ices_rectangles')
        .select('rectangle_code, center_lat, center_lon, copernicus_region')
        .eq('rectangle_code', rect.code)
        .single();

      if (rectErr || !rectData) {
        console.log(`❌ Rectangle not found: ${rectErr?.message}`);
        continue;
      }

      console.log(`✅ Rectangle found: ${rectData.center_lat}, ${rectData.center_lon}`);

      // 2. Check conditions data
      const { data: conditions, error: condErr } = await supabase
        .from('findr_conditions_latest')
        .select('*')
        .eq('rectangle_code', rect.code)
        .maybeSingle();

      if (condErr) {
        console.log(`❌ Conditions error: ${condErr.message}`);
      } else if (!conditions) {
        console.log(`⚠️  No conditions data`);
      } else {
        console.log(`✅ Conditions: temp=${conditions.sea_temp_c}°C, salinity=${conditions.salinity_psu} psu`);
        const age = ((Date.now() - new Date(conditions.captured_at).getTime()) / (1000 * 60 * 60)).toFixed(1);
        console.log(`   Data age: ${age}h`);
      }

      // 3. Get species count
      const { count: speciesCount } = await supabase
        .from('species')
        .select('*', { count: 'exact', head: true });

      console.log(`✅ ${speciesCount} total species in database`);

      // 4. Try calling the RPC function directly (if it exists)
      console.log('\n   Attempting RPC call...');

      const { data: predictions, error: rpcErr } = await supabase
        .rpc('get_environmental_predictions_enhanced', {
          target_rectangle: rect.code,
          target_date: new Date().toISOString().split('T')[0]
        }) as { data: any[], error: any };

      if (rpcErr) {
        console.log(`   ❌ RPC Error: ${rpcErr.message}`);
        console.log(`   Code: ${rpcErr.code}`);

        // This is the critical issue we need to document
        if (rpcErr.code === 'PGRST202') {
          console.log(`\n   🔴 CRITICAL: RPC function not found in PostgREST schema cache`);
          console.log(`   Possible causes:`);
          console.log(`   1. Migration not applied to production database`);
          console.log(`   2. Supabase PostgREST schema cache not refreshed`);
          console.log(`   3. Function exists in wrong schema (not public)`);
          console.log(`\n   Solution: Check Supabase dashboard > Database > Functions`);
        }
      } else {
        console.log(`   ✅ RPC Success: ${predictions?.length} species returned`);
        if (predictions && predictions.length > 0) {
          console.log(`\n   Top 3 species:`);
          predictions.slice(0, 3).forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.species_common_name}: ${p.confidence_percent}%`);
          });
        }
      }

    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
    }
  }

  console.log('\n\n✅ Direct database test complete\n');
}

testDatabaseDirectly();
