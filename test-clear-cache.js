// Quick test to clear cache by calling Supabase directly
import { createClient } from '@supabase/supabase-js';

async function clearPredictionCache() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('Clearing prediction cache...');
  
  // Delete cache entries from the last few hours
  const { data, error } = await supabase
    .from('findr_prediction_sessions')
    .delete()
    .gte('fetched_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());
    
  if (error) {
    console.error('Error clearing cache:', error);
  } else {
    console.log('Cache cleared successfully. Deleted entries:', data?.length || 0);
  }
}

clearPredictionCache().catch(console.error);