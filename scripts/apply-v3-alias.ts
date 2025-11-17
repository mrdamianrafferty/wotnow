import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log('Applying v3 alias migration...\n');

  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '202511170005_alias_v3_as_default.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Migration applied successfully!');
  console.log('\nTesting get_fishing_confidence (should use v3)...\n');

  const { data, error: testError } = await supabase.rpc('get_fishing_confidence', {
    target_rectangle: '31F2',
    target_date: '2025-11-17',
    target_month: 11
  });

  if (testError) {
    console.error('❌ Test error:', testError);
    process.exit(1);
  }

  const withSeasonality = data?.filter((d: any) => d.seasonal_phase !== 'no_data') || [];
  console.log(`✅ Function works! ${withSeasonality.length}/${data?.length} species with seasonality data`);
  console.log('\nThe default get_fishing_confidence() now uses V3 with regional seasonality!');
}

applyMigration().catch(console.error);
