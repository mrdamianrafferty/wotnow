#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkPlayfulBios() {
  const { data, error } = await supabase
    .from('species')
    .select('species_code, name_en, playful_bio_en')
    .in('species_code', ['bonito', 'wrb', 'bss', 'chub-mack', 'bluefish'])
    .limit(10);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('✅ Query successful. Results:');
  console.table(data.map(d => ({
    code: d.species_code,
    name: d.name_en,
    has_bio: d.playful_bio_en ? 'YES' : 'NO',
    bio_preview: d.playful_bio_en ? d.playful_bio_en.substring(0, 50) + '...' : 'NULL'
  })));
}

checkPlayfulBios();
