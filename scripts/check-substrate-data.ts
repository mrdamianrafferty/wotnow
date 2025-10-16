#!/usr/bin/env node
/**
 * Check substrate preferences for common species
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSubstrates() {
  const { data, error } = await supabase
    .from('species_substrates')
    .select('species_code, has_rock, has_sand, has_gravel, has_mud, has_mixed')
    .in('species_code', ['wrb', 'wra', 'wr1', 'bss', 'mul', 'pla', 'dab']);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Substrate Preferences:');
  console.log('======================\n');
  
  data?.forEach(s => {
    const prefs = [];
    if (s.has_rock) prefs.push('rock');
    if (s.has_sand) prefs.push('sand');
    if (s.has_gravel) prefs.push('gravel');
    if (s.has_mud) prefs.push('mud');
    if (s.has_mixed) prefs.push('mixed');
    
    console.log(`${s.species_code}: ${prefs.join(', ') || 'NONE'}`);
  });
}

checkSubstrates();
