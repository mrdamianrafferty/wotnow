import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!;
const supabase = createClient(url, key);

async function main() {
  const testCases = [
    { code: '26C7', date: '2025-10-15' },
    { code: '31F2', date: '2025-10-15' },
    { code: '39E7', date: '2025-10-15' },
  ];

  console.log('Testing get_environmental_predictions_basic RPC...\n');

  for (const test of testCases) {
    console.log(`📍 Testing ${test.code} on ${test.date}`);
    
    const { data, error } = await supabase.rpc('get_environmental_predictions_basic', {
      p_rectangle_code: test.code,
      p_date: test.date,
      p_language: 'en'
    });

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else if (!data || data.length === 0) {
      console.log(`  ⚠️  No predictions returned`);
    } else {
      console.log(`  ✅ Got ${data.length} predictions`);
      console.log(`     First species: ${data[0].species_name_en}`);
      console.log(`     Bite score: ${data[0].bite_score}`);
      console.log(`     Temp used: ${data[0].temperature_c}°C`);
      console.log(`     Salinity: ${data[0].salinity ?? 'null'}`);
    }
    console.log('');
  }

  // Check cache table
  console.log('\nChecking findr_prediction_sessions cache...\n');
  const { data: sessions } = await supabase
    .from('findr_prediction_sessions')
    .select('rectangle_code, prediction_date, species_count')
    .limit(5)
    .order('created_at', { ascending: false });

  if (sessions && sessions.length > 0) {
    console.log('Recent cached sessions:');
    sessions.forEach(s => {
      console.log(`  ${s.rectangle_code} @ ${s.prediction_date}: ${s.species_count} species`);
    });
  } else {
    console.log('No cached prediction sessions found');
  }
}

main();
