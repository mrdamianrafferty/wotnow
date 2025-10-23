// Check all function signatures in the database
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkFunctionSignatures() {
  console.log('Checking function signatures in database...\n');

  try {
    const { data, error } = await supabase.rpc('pg_catalog.pg_get_functiondef', {
      funcid: '(SELECT oid FROM pg_proc WHERE proname = \'get_environmental_predictions_enhanced\' LIMIT 1)'
    });

    if (error) {
      console.log('Using alternative query...\n');

      // Try a direct query instead
      const result = await supabase
        .from('pg_proc')
        .select('*')
        .eq('proname', 'get_environmental_predictions_enhanced');

      console.log('Result:', result);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkFunctionSignatures();
