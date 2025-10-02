import { getSupabaseServerClient } from '../lib/supabase/serverClient';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  try {
    const supabase = getSupabaseServerClient();
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20251001003_create_ices_rectangles.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('Running ICES rectangles migration...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    
    console.log('Migration completed successfully!');
    console.log('Result:', data);
    
    // Test that rectangles are available
    const { data: rectangles, error: fetchError } = await supabase
      .from('ices_rectangles')
      .select('rectangle_code, region')
      .limit(5);
    
    if (fetchError) {
      console.error('Error fetching rectangles:', fetchError);
    } else {
      console.log('Sample rectangles:', rectangles);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

runMigration();