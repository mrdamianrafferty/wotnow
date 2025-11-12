// Check which migrations have been applied
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('📋 Checking applied migrations...\n');

  // Check recent migrations from November 12
  const { data: migrations, error } = await supabase
    .from('supabase_migrations.schema_migrations')
    .select('version, name, statements')
    .gte('version', '20251112000000')
    .order('version', { ascending: false });

  if (error) {
    console.error('❌ Error querying migrations:', error.message);
    console.log('\nTrying alternate approach...\n');

    // Try direct query via SQL
    const { data: alt, error: altErr } = await supabase.rpc('sql', {
      query: `SELECT version, name FROM supabase_migrations.schema_migrations
              WHERE version >= '20251112000000'
              ORDER BY version DESC`
    });

    if (altErr) {
      console.error('❌ Also failed:', altErr.message);
    } else {
      console.log('✅ Migrations:', alt);
    }
  } else {
    console.log('✅ Applied migrations from Nov 12:');
    migrations?.forEach(m => {
      console.log(`   - ${m.version}: ${m.name}`);
    });

    // Check if the region mapping migration was applied
    const regionMapping = migrations?.find(m => m.version === '20251112210000');
    if (regionMapping) {
      console.log('\n✅ Region mapping migration WAS applied');
    } else {
      console.log('\n❌ Region mapping migration NOT FOUND');
    }
  }

  console.log('\n✅ Check complete\n');
}

main().catch(console.error);
