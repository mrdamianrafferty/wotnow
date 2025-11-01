import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findSpecies() {
  console.log('🔍 Searching for common species...\n');

  const searchTerms = ['Mackerel', 'Sea Bass', 'Cod', 'Herring', 'Pollack', 'Wrasse', 'Dentex'];

  for (const term of searchTerms) {
    const { data, error } = await supabase
      .from('species')
      .select('id, species_code, name_en, slug')
      .ilike('name_en', `%${term}%`)
      .limit(3);

    if (error) {
      console.log(`❌ Error searching for "${term}":`, error);
    } else if (data && data.length > 0) {
      console.log(`✅ "${term}":`);
      data.forEach(s => {
        console.log(`   - ${s.name_en} (code: ${s.species_code}, slug: ${s.slug}, id: ${s.id})`);
      });
    } else {
      console.log(`❌ No results for "${term}"`);
    }
  }
}

findSpecies()
  .then(() => {
    console.log('\n✅ Search complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
