import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectBioBandsTable() {
  console.log('🔍 Inspecting species_bio_bands table structure\n');
  console.log('=' .repeat(80));
  
  // Check if table exists and get some sample data
  const { data, error } = await supabase
    .from('species_bio_bands')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error('Error querying species_bio_bands:', error);
    console.log('\nTable might not exist yet, or needs to be created.');
  } else {
    console.log(`\nFound ${data?.length || 0} records in species_bio_bands\n`);
    
    if (data && data.length > 0) {
      console.log('Sample record:');
      console.log(JSON.stringify(data[0], null, 2));
      
      console.log('\n\nAll records:');
      for (const record of data) {
        console.log(`\n${record.parameter}:`);
        console.log(`  Happy bands: ${JSON.stringify(record.happy_bands)}`);
        console.log(`  Unhappy bands: ${JSON.stringify(record.unhappy_bands)}`);
      }
    } else {
      console.log('Table exists but is empty. Ready to populate!');
    }
  }
  
  // Try to get species IDs to understand the structure
  const { data: speciesData, error: speciesError } = await supabase
    .from('species')
    .select('id, species_code, name_en')
    .limit(5);
  
  if (!speciesError && speciesData) {
    console.log('\n\nSample species IDs (for reference):');
    speciesData.forEach(s => {
      console.log(`  ${s.species_code}: ${s.id} (${s.name_en})`);
    });
  }
}

inspectBioBandsTable()
  .then(() => {
    console.log('\n✅ Inspection complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
