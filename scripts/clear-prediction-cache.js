#!/usr/bin/env node

/**
 * Clear prediction cache for testing Phase 10 environmental data
 * Run: node scripts/clear-prediction-cache.js 31F1 2025-10-12
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearCache(rectangleCode, predictionDate) {
  console.log(`🧹 Clearing cache for ${rectangleCode} on ${predictionDate}...`);
  
  const { data, error } = await supabase
    .from('findr_prediction_sessions')
    .delete()
    .eq('rectangle_code', rectangleCode)
    .eq('prediction_date', predictionDate)
    .select();
  
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  console.log(`✅ Cleared ${data?.length || 0} cached entries`);
  
  // Also clear all caches if "all" is specified
  if (rectangleCode === 'all') {
    const { data: allData, error: allError } = await supabase
      .from('findr_prediction_sessions')
      .delete()
      .gte('created_at', '1970-01-01')
      .select();
    
    if (allError) {
      console.error('❌ Error clearing all:', allError.message);
    } else {
      console.log(`✅ Cleared ALL ${allData?.length || 0} cached entries`);
    }
  }
}

const rectangleCode = process.argv[2] || '31F1';
const predictionDate = process.argv[3] || new Date().toISOString().slice(0, 10);

clearCache(rectangleCode, predictionDate).then(() => {
  console.log('✨ Cache cleared! Refresh the page to see new data.');
  process.exit(0);
}).catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
