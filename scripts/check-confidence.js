#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkFunction() {
  // Query the function definition
  const { data, error } = await supabase.rpc('get_environmental_predictions_basic', {
    target_rectangle: '31F1',
    target_date: '2025-10-16'
  });
  
  if (error) {
    console.error('❌ Error calling function:', error);
    return;
  }
  
  console.log('✅ Function returned', data?.length, 'predictions');
  if (data && data.length > 0) {
    console.log('\nFirst prediction:');
    console.log(JSON.stringify(data[0], null, 2));
    
    // Check confidence values
    const confidences = data.map(p => p.confidence);
    const uniqueConfidences = [...new Set(confidences)];
    console.log('\n📊 Confidence values:');
    console.log('- Unique values:', uniqueConfidences);
    console.log('- All same?', uniqueConfidences.length === 1);
  }
}

checkFunction();
