// Clear prediction cache for testing
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function clearCache() {
  console.log('Clearing all prediction cache...');

  const { data: before, error: beforeError } = await supabase
    .from('findr_prediction_sessions')
    .select('rectangle_code, prediction_date, language, fetched_at');

  if (beforeError) {
    console.error('Error reading cache:', beforeError);
    return;
  }

  console.log(`Found ${before?.length || 0} cached predictions`);

  const { error: deleteError } = await supabase
    .from('findr_prediction_sessions')
    .delete()
    .gte('fetched_at', '2000-01-01'); // Delete all rows (using fetched_at filter)

  if (deleteError) {
    console.error('Error deleting cache:', deleteError);
    return;
  }

  console.log('✅ Cache cleared successfully!');
}

clearCache().catch(console.error);
