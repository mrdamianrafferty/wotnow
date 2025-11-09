import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSpecificUrls() {
  // Check the two problem species the user mentioned
  const { data, error } = await supabase
    .from('species')
    .select('id, name_en, scientific_name, species_code, inaturalist_url')
    .in('name_en', ['Sea Bass', 'Whiting'])
    .order('name_en');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== Checking iNaturalist URLs for problem species ===\n');

  data?.forEach(s => {
    console.log(`Species: ${s.name_en}`);
    console.log(`Scientific: ${s.scientific_name}`);
    console.log(`Code: ${s.species_code}`);
    console.log(`Current URL: ${s.inaturalist_url}`);
    console.log('');
  });

  // Also check if there's an inat_taxon_id column
  const { data: colData, error: colError } = await supabase
    .from('species')
    .select('*')
    .limit(1);

  if (colData && colData[0]) {
    const columns = Object.keys(colData[0]);
    const hasInatTaxonId = columns.includes('inat_taxon_id');
    console.log(`\nTable has 'inat_taxon_id' column: ${hasInatTaxonId}`);

    if (hasInatTaxonId) {
      // Check if these species have inat_taxon_id set
      const { data: taxonData } = await supabase
        .from('species')
        .select('name_en, scientific_name, inaturalist_url, inat_taxon_id')
        .in('name_en', ['Sea Bass', 'Whiting']);

      console.log('\ninat_taxon_id values:');
      taxonData?.forEach(s => {
        console.log(`${s.name_en}: inat_taxon_id=${(s as any).inat_taxon_id || 'null'}`);
      });
    }
  }
}

checkSpecificUrls().catch(console.error);
