#!/usr/bin/env node

/**
 * Clear ALL prediction cache entries for a given date
 * This is useful when you've updated the prediction function and need fresh data
 * Run: node scripts/clear-all-cache-for-date.js 2025-10-12
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

async function clearAllCacheForDate(predictionDate) {
  console.log(`🧹 Clearing ALL cache entries for ${predictionDate}...`);
  
  const { data, error } = await supabase
    .from('findr_prediction_sessions')
    .delete()
    .eq('prediction_date', predictionDate)
    .select();
  
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  console.log(`✅ Cleared ${data?.length || 0} cached entries for ${predictionDate}`);
  
  // Show which rectangles were cleared
  if (data && data.length > 0) {
    const rectangles = [...new Set(data.map(d => d.rectangle_code))];
    console.log(`📍 Rectangles cleared: ${rectangles.join(', ')}`);
  }
}

const predictionDate = process.argv[2] || new Date().toISOString().slice(0, 10);

clearAllCacheForDate(predictionDate).then(() => {
  console.log('');
  console.log('✨ All cache cleared for this date!');
  console.log('🔄 Refresh your browser to fetch fresh predictions with environmental data.');
  process.exit(0);
}).catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
