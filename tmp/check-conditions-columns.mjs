// Check what columns exist in findr_conditions_latest table
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.cli
dotenv.config({ path: join(__dirname, '../.env.cli') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkColumns() {
  console.log('Checking findr_conditions_latest table structure...\n');

  const { data, error } = await supabase
    .from('findr_conditions_latest')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in findr_conditions_latest table:');
    Object.keys(data[0]).forEach(col => {
      console.log('  -', col);
    });

    console.log('\nFirst row sample:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No data in findr_conditions_latest');
  }
}

checkColumns().catch(console.error);
