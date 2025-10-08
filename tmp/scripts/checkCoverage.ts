import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const { data, error } = await client
    .from('findr_conditions_latest')
    .select('rectangle_code, source')
    .not('source', 'in', '("ingest:metno-primary","ingest:openmeteo")');

  if (error) {
    console.error('Supabase query failed:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('All rectangles are covered by MET Norway or Open-Meteo.');
    return;
  }

  console.log(`Rectangles missing MET/Open-Meteo coverage (${data.length}):`);
  for (const row of data) {
    console.log(`${row.rectangle_code}: ${row.source}`);
  }
}

main().catch((err) => {
  console.error('Unexpected error', err);
  process.exit(1);
});
