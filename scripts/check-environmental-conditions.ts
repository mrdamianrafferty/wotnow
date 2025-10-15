import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!;
const supabase = createClient(url, key);

async function main() {
  console.log('🔍 Checking rectangle_environmental_conditions view/table\n');

  // Check if we have any data
  const { data, error, count } = await supabase
    .from('rectangle_environmental_conditions')
    .select('*', { count: 'exact' })
    .limit(5);

  if (error) {
    console.error('❌ Error querying rectangle_environmental_conditions:');
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Details: ${error.details}`);
    console.error(`   Hint: ${error.hint}`);
    return;
  }

  console.log(`📊 Total rows in rectangle_environmental_conditions: ${count}`);
  
  if (data && data.length > 0) {
    console.log('\n✅ Sample data (first 5 rows):\n');
    data.forEach((row: any) => {
      console.log(`Rectangle: ${row.rectangle_code}`);
      console.log(`  - Temperature: ${row.temperature_c}°C`);
      console.log(`  - Salinity: ${row.salinity}`);
      console.log(`  - Substrate: ${row.substrate_type}`);
      console.log(`  - Depth: ${row.fishing_depth_m}m`);
      console.log(`  - Data Age: ${row.data_age_hours}h`);
      console.log(`  - Source: ${row.data_source}`);
      console.log('');
    });
  } else {
    console.log('\n⚠️  No data found in rectangle_environmental_conditions');
    console.log('\nThis table/view needs to be populated with data from:');
    console.log('  - findr_conditions_snapshots (MET Norway/Open-Meteo data)');
    console.log('  - OR created as a view that joins snapshots with rectangles');
  }

  // Check if findr_conditions_snapshots has data
  console.log('\n🔍 Checking findr_conditions_snapshots table...\n');
  
  const { count: snapshotCount } = await supabase
    .from('findr_conditions_snapshots')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total snapshots: ${snapshotCount ?? 0}`);

  if (snapshotCount && snapshotCount > 0) {
    const { data: samples } = await supabase
      .from('findr_conditions_snapshots')
      .select('rectangle_code, sea_temp_c, wave_height_m, source, captured_at')
      .limit(5);

    console.log('\n✅ Sample snapshots:\n');
    samples?.forEach((snap: any) => {
      console.log(`  ${snap.rectangle_code}: ${snap.sea_temp_c}°C, ${snap.wave_height_m}m waves (${snap.source}) at ${snap.captured_at}`);
    });
  }
}

main().catch(console.error);
