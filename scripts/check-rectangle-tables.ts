#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTable(tableName: string) {
  console.log(`\n📊 ${tableName}`);
  console.log('='.repeat(80));

  // Check if table exists and get sample data
  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: false })
    .limit(3);

  if (error) {
    console.log(`❌ Error: ${error.message}`);
    return;
  }

  console.log(`✅ Found ${count} rows`);

  if (data && data.length > 0) {
    console.log('\n📝 Sample row:');
    console.log(JSON.stringify(data[0], null, 2));

    console.log('\n🔑 Available columns:');
    console.log(Object.keys(data[0]).join(', '));
  }
}

async function main() {
  console.log('🔍 Checking Rectangle Tables\n');

  const tables = [
    'rectangles_025deg_api',
    'rectangles_grid_with_ices',
    'rectangles_unified',
    'rectangles_025deg',
  ];

  for (const table of tables) {
    await checkTable(table);
  }

  console.log('\n\n✅ Check complete!');
}

main().catch(console.error);
