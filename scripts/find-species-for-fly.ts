import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findSpeciesForFly() {
  // Query for salmons, trout, bass, and mullet species
  const { data, error } = await supabase
    .from('species')
    .select('id, name_en, scientific_name, recommended_baits, slug')
    .or(
      'name_en.ilike.%salmon%,' +
      'name_en.ilike.%trout%,' +
      'name_en.ilike.%bass%,' +
      'name_en.ilike.%mullet%'
    )
    .order('name_en');

  if (error) {
    console.error('Error fetching species:', error);
    return;
  }

  console.log('\nSpecies matching salmon, trout, bass, or mullet:\n');
  console.log('ID\tSlug\t\t\tName\t\t\t\tCurrent Baits');
  console.log('='.repeat(120));

  data?.forEach((species) => {
    const baitsStr = species.recommended_baits?.join(', ') || 'None';
    console.log(`${species.id}\t${(species.slug || '').padEnd(20)}\t${species.name_en.padEnd(32)}\t${baitsStr}`);
  });

  console.log('\n\nTotal species found:', data?.length);

  // Show which ones already have recommended baits
  const withBaits = data?.filter(s => s.recommended_baits && s.recommended_baits.length > 0) || [];
  const withoutBaits = data?.filter(s => !s.recommended_baits || s.recommended_baits.length === 0) || [];

  console.log('\nWith existing baits:', withBaits.length);
  console.log('Without baits:', withoutBaits.length);
}

findSpeciesForFly().catch(console.error);
