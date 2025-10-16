#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkWrasseSubstrates() {
  const { data, error } = await supabase
    .from('species_substrates')
    .select('*')
    .or('species_code.eq.wrb,species_code.eq.wra,species_code.eq.wr1');

  if (error) {
    console.error(error);
    return;
  }

  console.log('Wrasse Substrate Data:');
  console.log(JSON.stringify(data, null, 2));
  
  // Count substrate types
  data?.forEach(w => {
    const count = [w.has_rock, w.has_sand, w.has_gravel, w.has_mud, w.has_mixed].filter(Boolean).length;
    console.log(`\n${w.species_code} (${w.name_en}): ${count} substrate types`);
  });
}

checkWrasseSubstrates();
