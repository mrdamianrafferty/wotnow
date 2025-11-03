/**
 * Run the home_coordinates to locations migration
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.cli') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials');
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'present' : 'missing');
  console.error('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'present' : 'missing');
  console.error('\nRun: npm run env:sync');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('='.repeat(80));
  console.log('Running home_coordinates to locations migration');
  console.log('='.repeat(80));
  console.log('');

  try {
    const { data, error } = await supabase.rpc('migrate_home_coordinates_to_locations');

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully');
    console.log('');

    // Check results
    const { data: stats } = await supabase
      .from('user_location_preferences')
      .select('user_id, locations, active_location_id')
      .not('locations', 'is', null);

    if (stats && stats.length > 0) {
      console.log(`Migrated ${stats.length} user(s):`);
      for (const row of stats) {
        const locations = row.locations as Array<unknown>;
        console.log(`  - User ${row.user_id}: ${locations.length} location(s)`);
      }
    } else {
      console.log('No users had home_coordinates to migrate (this is fine for a clean database)');
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('Migration Complete');
    console.log('='.repeat(80));
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  });
