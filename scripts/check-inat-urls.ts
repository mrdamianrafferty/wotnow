import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkInatUrls() {
  // Get all species with iNaturalist URLs
  const { data, error } = await supabase
    .from('species')
    .select('id, name_en, scientific_name, inaturalist_url')
    .not('inaturalist_url', 'is', null)
    .order('name_en');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\nFound ${data?.length} species with iNaturalist URLs\n`);
  console.log('Sample of species with URLs:\n');

  // Show first 20 and the two problem cases
  const problemSpecies = ['Sea Bass', 'Whiting'];
  const samples = data?.filter(s =>
    problemSpecies.includes(s.name_en) ||
    data.indexOf(s) < 20
  ) || [];

  samples.forEach(s => {
    console.log(`${s.name_en} (${s.scientific_name}):`);
    console.log(`  ${s.inaturalist_url}\n`);
  });

  console.log(`\nTotal species with iNaturalist URLs: ${data?.length}`);
}

checkInatUrls().catch(console.error);
