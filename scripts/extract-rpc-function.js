#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function extractFunction() {
  // Query pg_proc for the function definition
  const query = `
    SELECT 
      p.proname as function_name,
      pg_get_functiondef(p.oid) as source_code
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'get_environmental_predictions_basic'
    LIMIT 1;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql: query });
  
  if (error) {
    console.error('Error:', error.message);
    console.log('\nTrying alternative method...\n');
    
    // Alternative: Just describe the function
    const descQuery = `
      SELECT 
        p.proname,
        pg_get_function_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as return_type,
        p.prosrc as source_snippet
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'get_environmental_predictions_basic';
    `;
    
    const { data: desc, error: descError } = await supabase.rpc('exec_sql', { sql: descQuery });
    if (desc) {
      console.log('Function Description:', JSON.stringify(desc, null, 2));
    } else {
      console.log('Could not retrieve function. Error:', descError?.message);
    }
    return;
  }
  
  if (data && data.length > 0) {
    console.log('='.repeat(80));
    console.log('FUNCTION:', data[0].function_name);
    console.log('='.repeat(80));
    console.log(data[0].source_code);
    console.log('='.repeat(80));
  } else {
    console.log('Function not found or no data returned');
  }
}

extractFunction();
