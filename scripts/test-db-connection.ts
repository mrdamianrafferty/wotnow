import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment Check:');
console.log('- SUPABASE_URL:', supabaseUrl);
console.log('- Has SERVICE_ROLE_KEY:', !!supabaseKey);
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing database connection...');
  
  // Test species table
  const { data: speciesData, error: speciesError, count: speciesCount } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true });
  
  console.log('');
  console.log('Species table:');
  console.log('- Count:', speciesCount);
  console.log('- Error:', speciesError?.message || 'None');
  
  // Test catch_log table
  const { data: catchData, error: catchError, count: catchCount } = await supabase
    .from('catch_log')
    .select('*', { count: 'exact', head: true });
  
  console.log('');
  console.log('Catch_log table:');
  console.log('- Count:', catchCount);
  console.log('- Error:', catchError?.message || 'None');
  
  // Test environmental_preferences view
  const { data: envData, error: envError, count: envCount } = await supabase
    .from('environmental_preferences')
    .select('*', { count: 'exact', head: true });
  
  console.log('');
  console.log('Environmental_preferences view:');
  console.log('- Count:', envCount);
  console.log('- Error:', envError?.message || 'None');
  
  // Try getting one species record
  const { data: sampleSpecies, error: sampleError } = await supabase
    .from('species')
    .select('species_code, name_en')
    .limit(5);
  
  console.log('');
  console.log('Sample species (first 5):');
  if (sampleError) {
    console.log('- Error:', sampleError.message);
  } else {
    console.log(sampleSpecies);
  }
}

testConnection().catch(console.error);
