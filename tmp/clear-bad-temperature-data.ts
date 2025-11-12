// Clear stale temperature data from findr_conditions_snapshots
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function clearData() {
  console.log('Clearing stale Open-Meteo temperature data...\n');

  // Delete all Open-Meteo source data (it's stale and incorrect)
  const { error: deleteErr } = await supabase
    .from('findr_conditions_snapshots')
    .delete()
    .eq('source', 'ingest:openmeteo');

  if (deleteErr) {
    console.error('❌ Error deleting data:', deleteErr);
    return;
  }

  console.log('✅ Cleared all Open-Meteo source data');
  console.log('   Next nightly job (02:30 UTC) will re-populate with fresh data');
  console.log('   Or run: npx tsx scripts/ingestFindrConditions.ts');
}

clearData().catch(console.error);
