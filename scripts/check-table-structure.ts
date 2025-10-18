import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTableStructure() {
  console.log('Checking species table structure...\n');
  
  const { data, error } = await supabase
    .from('species')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ Species table columns:');
    console.log(Object.keys(data[0]).sort().join(', '));
    console.log('\n📋 Sample record:');
    console.log(JSON.stringify(data[0], null, 2));
    
    // Check if alias exists
    const hasAlias = 'alias' in data[0];
    console.log(`\n${hasAlias ? '✅' : '❌'} Alias column exists: ${hasAlias}`);
  }
}

checkTableStructure();
