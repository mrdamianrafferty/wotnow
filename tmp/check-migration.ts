import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigrations() {
  console.log('Checking applied migrations...\n');

  const { data, error } = await supabase
    .from('schema_migrations')
    .select('version, name')
    .like('version', '202511%')
    .order('version', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Recent November 2025 migrations:');
  data?.forEach(m => {
    console.log(`  ${m.version} - ${m.name}`);
  });

  // Check if our migration exists
  const our_migration = data?.find(m => m.version === '20251112000007');
  if (our_migration) {
    console.log('\n✅ Migration 20251112000007_fix_rpc_numeric_casting.sql IS applied');
  } else {
    console.log('\n❌ Migration 20251112000007_fix_rpc_numeric_casting.sql NOT applied');
  }
}

checkMigrations();
