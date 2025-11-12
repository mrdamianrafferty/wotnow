import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('Applying RPC fix directly...\n');

  // Read the migration SQL
  const sql = readFileSync(
    join(__dirname, '../supabase/migrations/20251112000008_fix_rpc_numeric_casting_v2.sql'),
    'utf-8'
  );

  // Split into statements (simple approach - splits on semicolons)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  // Execute DROP FUNCTION
  console.log('1. Dropping function...');
  const dropSQL = statements[0] + ';';
  const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropSQL }).catch(() => ({ error: null }));

  // For Supabase we need to use their SQL execution approach
  // Let's try a more direct approach using fetch

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    console.error('Error executing SQL:', await response.text());
    return;
  }

  console.log('✅ Fix applied successfully!');
}

applyFix();
