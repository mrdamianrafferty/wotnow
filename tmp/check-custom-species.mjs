import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Search for gentian specifically
  const { data: gentian, error: gerr } = await supabase
    .from('custom_species_suggestions')
    .select('*')
    .ilike('common_name', '%gentian%');
  
  console.log('Gentian results:', JSON.stringify(gentian, null, 2));
  if (gerr) console.log('Gentian error:', gerr);
  
  // Also check all custom species
  const { data, error } = await supabase
    .from('custom_species_suggestions')
    .select('id, common_name, scientific_name')
    .limit(10);
  
  console.log('\nAll custom species:', JSON.stringify(data, null, 2));
  if (error) console.log('Error:', error);
}

check();
