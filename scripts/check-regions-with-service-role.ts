import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Try with service role key if available
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (serviceKey) {
  console.log('Using service role key for verification...\n');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceKey
  );
  
  async function check() {
    const { data, error } = await supabase
      .from('species')
      .select('name_en, biogeographic_regions')
      .limit(10);
      
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    
    console.log(`Total sample: ${data?.length || 0} species\n`);
    
    if (data && data.length > 0) {
      console.log('Sample species:');
      data.forEach(s => {
        console.log(`  ${s.name_en}: ${s.biogeographic_regions ? JSON.stringify(s.biogeographic_regions) : 'NULL'}`);
      });
      
      const withRegions = data.filter(s => s.biogeographic_regions !== null).length;
      console.log(`\n${withRegions}/${data.length} have regions populated`);
    }
  }
  
  check().catch(console.error);
} else {
  console.log('❌ No SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.log('\nPlease run this SQL directly in Supabase SQL Editor:');
  console.log('```sql');
  console.log('SELECT name_en, biogeographic_regions');
  console.log('FROM species');
  console.log('LIMIT 10;');
  console.log('```');
}
