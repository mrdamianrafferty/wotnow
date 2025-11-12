// Check moon_cache table columns
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.cli') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkColumns() {
  console.log('Checking moon_cache table...\n');

  const { data, error } = await supabase
    .from('moon_cache')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]).join(', '));
    console.log('\nSample:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No data');
  }
}

checkColumns().catch(console.error);
