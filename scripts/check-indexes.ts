import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !key) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkIndexes() {
  console.log('Checking indexes on ices_rectangles table...\n');

  // First, try to get the table OID
  const { data: tableInfo, error: tableError } = await supabase
    .from('pg_class')
    .select('oid')
    .eq('relname', 'ices_rectangles')
    .eq('relkind', 'r')
    .single();

  if (tableError || !tableInfo) {
    console.error('❌ Could not find ices_rectangles table');
    console.error('  Make sure the table exists first');
    return;
  }

  // Query pg_stat_user_indexes which should be accessible
  const { data, error } = await supabase
    .from('pg_stat_user_indexes')
    .select('indexrelname, schemaname, relname')
    .eq('relname', 'ices_rectangles')
    .order('indexrelname');

  if (error) {
    console.error('❌ Error querying indexes:', error.message);
    // Try alternative approach with pg_indexes
    console.log('\nTrying alternative query method...');
    const { data: indexData, error: indexError } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .eq('tablename', 'ices_rectangles')
      .eq('schemaname', 'public')
      .order('indexname');

    if (indexError) {
      console.error('❌ Alternative query also failed:', indexError.message);
      return;
    }

    // Use the alternative data
    if (indexData) {
      processIndexResults(indexData.map((row: any) => ({ indexrelname: row.indexname })));
      return;
    }
  }

  processIndexResults(data);
}

function processIndexResults(data: any) {
  if (!data || data.length === 0) {
    console.log('❌ NO INDEXES FOUND on ices_rectangles table');
    console.log('\nYou need to run:');
    console.log('  supabase db push');
    return;
  }

  console.log('✅ INDEXES FOUND:');
  console.log('==================');
  data.forEach((row: any) => {
    const indexName = row.indexrelname || row.indexname;
    console.log(`✓ ${indexName}`);
  });
  console.log(`\n✅ Total: ${data.length} indexes on ices_rectangles table`);

  // Check for our specific new indexes
  const expectedIndexes = [
    'ices_rectangles_rectangle_code_idx',
    'ices_rectangles_region_idx',
    'ices_rectangles_coastal_idx',
    'ices_rectangles_location_idx',
    'ices_rectangles_cmems_region_idx',
    'ices_rectangles_code_region_idx',
  ];

  const foundIndexNames = data.map((row: any) => row.indexrelname || row.indexname);
  const missingIndexes = expectedIndexes.filter(idx => !foundIndexNames.includes(idx));

  if (missingIndexes.length > 0) {
    console.log('\n⚠️  Missing expected Phase 1 indexes:');
    missingIndexes.forEach(idx => console.log(`  - ${idx}`));
    console.log('\nRun: supabase db push');
  } else {
    console.log('\n✅ All Phase 1 performance indexes are in place!');
  }
}

checkIndexes().catch(console.error);
